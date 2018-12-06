import { BSpline } from "./BSpline.js"

class BSplineEditor {
    constructor() {
        this.pointJustAdded = false;
        this.selectedBSpline = -1;
        this.selectedHandle = -1;

        this.showControlPolygons = true;
        this.showControlHandles = true;
        this.showBSplines = true;
        this.showSurface = true;
        this.showMesh = true;
        this.showKnotValues = true;
        this.showNodes = true;

        this.shortcutsEnabled = true;
        this.then = 0.0;
        this.canvas = document.querySelector('#glcanvas');
        this.gl = this.canvas.getContext('webgl', {alpha:false}) || this.canvas.getContext('experimental-webgl');
        this.zoom = 20.0;
        this.addToFront = false;
        this.addToBack = true;
        this.addToClosest = false;
        this.snappingEnabled = true;
        this.zooming = false;
        this.mousedown = false;
        this.touchstart = false;
        this.doubletapped = false;

        this.editingU = true;

        /* Editor stuff */
        this.draggingHandle = false;
        this.originalRay = null;
        this.originalHandlePos;

        /* Camera stuff */
        this.perspectiveMatrix = mat4.create();
        this.viewMatrix = mat4.create();

        this.ortho = false;
        this.near = 0.0001;
        this.far = 100.0;
        this.fovy = 45;

        this.x = 0.0;
        this.y = 0.0;
        this.lastx = 0.0;
        this.lasty = 0.0;
        
        this.rotX = 3.14 * .25;
        this.rotY = 3.14 * .25;
        this.pos = vec3.create();
        
        /* Rotation */
        this.rotating = false;
        this.drx = 0.0;
        this.dry = 0.0;
        this.ddrx = 0.0;
        this.ddry = 0.0;

        /* Pan */
        this.panning = false;
        this.dpx = 0.0;
        this.dpy = 0.0;
        this.ddpx = 0.0;
        this.ddpy = 0.0;

        /* Dolly */
        this.ddx = 0.0;
        this.ddy = 0.0;
        this.dddx = 0.0;
        this.dddy = 0.0;

        // If we don't have a GL context, give up now  
        if (!this.gl) {
            alert('Unable to initialize WebGL. Your browser or machine may not support it.');
            return;
        }

        /* Handle canvas resizes */
        this.resize();
        this.canvas.onresize = function () { this.resize(); }

        /* Initialize spline shaders, start off with a random spline */
        BSpline.Initialize(this.gl);

        this.splines = [];
        if (localStorage.getItem("splines")) {
            let splineObjs = JSON.parse(localStorage.getItem("splines"));
            for (var i = 0; i < splineObjs.length; ++i) {
                this.splines.push(new BSpline(splineObjs[i]));
            }
        } 
        else {
            for (let i = 0; i < 1; ++i) {
                this.splines.push(new BSpline());
                this.backup();
            }
        }
        
        
        if (this.splines.length > 0) {
            this.selectedBSpline = 0; // TEMPORARY
            this.splines[0].selected = true;
        }

        /* Setup Hammer Events / */
        var hammer = new Hammer(this.canvas, {
            domEvents: true
        });

        hammer.get('pinch').set({ enable: true });

        hammer.get('press').set({
            time: 200
        });

        hammer.get('pan').set({
            threshold: 9,
            direction: Hammer.DIRECTION_ALL,
        });

        hammer.on("pinchstart", (e) => {
            var bb = e.target.getBoundingClientRect();
            var x = (e.center.x - bb.left) / this.zoom - this.gl.canvas.clientWidth / (2.0 * this.zoom);
            var y = (e.center.y - bb.top) / this.zoom - this.gl.canvas.clientHeight / (2.0 * this.zoom);
            var dx = e.deltaX / this.zoom;
            var dy =  e.deltaY / this.zoom;
            
            this.lastx = (e.center.x - bb.left) / (bb.right - bb.left) ;
            this.x =  (e.center.x - bb.left) / (bb.right - bb.left);
            this.lasty =  (e.center.y - bb.top) / (bb.bottom - bb.top);
            this.y =  (e.center.y - bb.top) / (bb.bottom - bb.top); 

            
            this.rotateStart(x, y, dx, dy);
        });

        hammer.on("pinchmove", (e) => {
            var bb = e.target.getBoundingClientRect();
            var x = (e.center.x - bb.left) / this.zoom - this.gl.canvas.clientWidth / (2.0 * this.zoom);
            var y = (e.center.y - bb.top) / this.zoom - this.gl.canvas.clientHeight / (2.0 * this.zoom);
            var dx = e.deltaX / this.zoom;
            var dy =  e.deltaY / this.zoom;
            
            this.lastx = this.x;
            this.x = (e.center.x - bb.left) / (bb.right - bb.left);
            this.lasty = this.y;
            this.y = (e.center.y - bb.top) / (bb.bottom - bb.top); 

            this.rotate(x, y, dx, dy);
        });

        hammer.on("pinchend", (e) => {
            this.rotateEnd();
        });

        /* Pan */
        hammer.on('panstart', (e) => {
            var bb = e.target.getBoundingClientRect();
            var x = (e.center.x - bb.left) / this.zoom - this.gl.canvas.clientWidth / (2.0 * this.zoom);
            var y = (e.center.y - bb.top) / this.zoom - this.gl.canvas.clientHeight / (2.0 * this.zoom);
            var dx = e.deltaX / this.zoom;
            var dy =  e.deltaY / this.zoom;
            
            this.lastx = (e.center.x - bb.left) / (bb.right - bb.left) ;
            this.x =  (e.center.x - bb.left) / (bb.right - bb.left);
            this.lasty =  (e.center.y - bb.top) / (bb.bottom - bb.top);
            this.y =  (e.center.y - bb.top) / (bb.bottom - bb.top); 

            if (((e.pointerType == "mouse") && (e.changedPointers[0].buttons & (1 << 0)) && (!e.changedPointers[0].ctrlKey)) || (e.pointerType == "touch"))
            {
                /* Try to drag a handle. If no handle is under the cursor, start rotating the camera. */
                this.dragHandleStart();
                if (!this.draggingHandle)
                    this.panStart(x, y, dx, dy);
            }
            
            if ( (e.pointerType == "mouse") && ((e.changedPointers[0].buttons & (1 << 1)) || (e.changedPointers[0].ctrlKey)) ) 
            {
                this.rotateStart(x, y, dx, dy);
            }
            // console.log(e);
        });
        hammer.on('pan', (e) => {
            var bb = e.target.getBoundingClientRect();
            var x = (e.center.x - bb.left) / this.zoom - this.gl.canvas.clientWidth / (2.0 * this.zoom);
            var y = (e.center.y - bb.top) / this.zoom - this.gl.canvas.clientHeight / (2.0 * this.zoom);
            var dx = e.deltaX / this.zoom;
            var dy =  e.deltaY / this.zoom;

            this.lastx = this.x;
            this.x = (e.center.x - bb.left) / (bb.right - bb.left);
            this.lasty = this.y;
            this.y = (e.center.y - bb.top) / (bb.bottom - bb.top); 
            

            if (((e.pointerType == "mouse") && (e.changedPointers[0].buttons & (1 << 0)) && (!e.changedPointers[0].ctrlKey)) || (e.pointerType == "touch"))
            {
                if (this.draggingHandle)
                    this.dragHandle();
                else
                    this.pan(x, y, dx, dy);
            }
            
            if ( (e.pointerType == "mouse") && ((e.changedPointers[0].buttons & (1 << 1)) || (e.changedPointers[0].ctrlKey)) ) 
            {
                this.rotate(x, y, dx, dy);
            }
        });
        hammer.on('panend', (e) => {
            this.dragHandleEnd();
            this.rotateEnd();
            this.panEnd();
            // if (((e.pointerType == "mouse") && (e.changedPointers[0].buttons & (1 << 0)) && (!e.changedPointers[0].ctrlKey)) || (e.pointerType == "touch"))
            // {
            // }
            
            // if ( (e.pointerType == "mouse") && ((e.changedPointers[0].buttons & (1 << 1)) || (e.changedPointers[0].ctrlKey)) ) 
            // {
            // }
        });

        /* Press */
        hammer.on('press', (e) => {
            var bb = e.target.getBoundingClientRect();
            this.lastx = (e.center.x - bb.left) / (bb.right - bb.left) ;
            this.x =  (e.center.x - bb.left) / (bb.right - bb.left);
            this.lasty =  (e.center.y - bb.top) / (bb.bottom - bb.top);
            this.y =  (e.center.y - bb.top) / (bb.bottom - bb.top); 

            this.press((e.center.x / this.zoom - this.gl.canvas.clientWidth / (2.0 * this.zoom)),
                (e.center.y / this.zoom - this.gl.canvas.clientHeight / (2.0 * this.zoom)));
            // console.log(e);
        });
        hammer.on('pressup', (e) => { this.pressUp(); });

        // /* Pinch */
        // hammer.on('pinchstart', (e) =>  {
        //     this.originalZoom = this.zoom;
        // });
        // hammer.on('pinch', (e) => { 
        //     this.zoom = this.originalZoom * e.scale;
        //     console.log(e.scale);
        // });
        // hammer.on('pinchend', (e) => { this.originalZoom = this.zoom; this.zooming = false; });

        /* Double tap */
        hammer.on('doubletap', (e) => {
            this.doubleTap((e.center.x / this.zoom - this.gl.canvas.clientWidth / (2.0 * this.zoom)),
                (e.center.y / this.zoom - this.gl.canvas.clientHeight / (2.0 * this.zoom)));
        });

        /* tap */
        hammer.on('tap', (e) => {
            this.tap((e.center.x / this.zoom - this.gl.canvas.clientWidth / (2.0 * this.zoom)),
                (e.center.y / this.zoom - this.gl.canvas.clientHeight / (2.0 * this.zoom)));
        });

        /* Setup keyboard shortcuts */
        document.onkeyup = (e) => {
            if (!this.shortcutsEnabled) return;

            if (e.keyCode == 67) this.hideBSplines();
            if (e.keyCode == 76) this.hideControlPolygons();
            if (e.keyCode == 80) this.hideControlHandles();
            if (e.keyCode == 65) this.addHandle();
            if (e.keyCode == 46) this.deleteLastHandle();
            if (e.keyCode == 78) this.newBSpline();

            this.backup();
        };

        /* Prevent right clicking the webgl canvas */
        this.canvas.oncontextmenu = function (e) {
            e.preventDefault();
            return false;
        }

        document.addEventListener("mousedown", (e) => { 
            if (e.button == 0)
                this.mousedown = true; 
        });
        document.addEventListener("mouseup", (e) => { 
            this.mousedown = false; 
            if (this.selectedBSpline != -1) {
                this.splines[this.selectedBSpline].clearTemporaryHandle();
            }            
        });
        document.addEventListener("touchstart", (e) => { 
            if (e.targetTouches.length < 2)
                this.mousedown = true; 
        });
        document.addEventListener("touchend", (e) => { this.mousedown = false; });
        document.addEventListener("touchcancel", (e) => { this.mousedown = false; });
    }

    setOrthoEnabled(enabled) {
        this.ortho = enabled;
    }

    updateZoom(zoomAmount) {
        this.zoom = Math.pow(10, zoomAmount);
        // this.zoom = 1.0;
        // this.zoomAmount = 1.0;
        // console.log(this.zoom)
    }

    setShortcutsEnabled(enabled) {
        this.shortcutsEnabled = enabled;
    }

    backup() {
        let json = JSON.stringify(this.splines);
        localStorage.setItem("splines", json)
    }

    /* Changes the webgl viewport to account for screen resizes */
    resize() {
        // Lookup the size the browser is displaying the canvas.
        var displayWidth = this.canvas.clientWidth;
        var displayHeight = this.canvas.clientHeight;

        // Check if the canvas is not the same size.
        if (this.canvas.width != displayWidth ||
            this.canvas.height != displayHeight) {

            // Make the canvas the same size
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(-this.canvas.clientWidth / 2, -this.canvas.clientHeight / 2, 2 * this.canvas.clientWidth, 2 * this.canvas.clientHeight);
        }
    }

    tap(x, y) {
        console.log("tap is currently unsupported");
    }

    getRay() {
        let ray = {
            pos: vec4.create(),
            dir: vec4.create()
        };

        let aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;

        /* Get camera world space position matrix */
        let invP = mat4.create();
        mat4.invert(invP, this.perspectiveMatrix);
        
        let invV = mat4.create();
        mat4.invert(invV, this.viewMatrix);

        if (this.ortho) {
            ray.dir[0] = -invV[8];
            ray.dir[1] = -invV[9];
            ray.dir[2] = -invV[10];
            ray.dir[3] = 0.0;
        } else {
            /* Compute clicked direction */
            let FocalLength = 1.0 / Math.tan(this.fovy / 2.0);
            ray.dir[0] = (2.0 * this.x - 1.0) * .5;
            ray.dir[1] = -(2.0 * this.y - 1.0) * .5;
            ray.dir[2] = -this.near;
            ray.dir[3] = 1.0;
            /* Camera space to world space */
            vec4.transformMat4(ray.dir, ray.dir, invP);
    
            ray.dir[3] = 0;
    
            vec4.transformMat4(ray.dir, ray.dir, invV);
    
        }
        
        vec4.normalize(ray.dir, ray.dir);
        
        
        ray.pos[0] = invV[12];
        ray.pos[1] = invV[13];
        ray.pos[2] = invV[14];
        ray.pos[3] = 1.0;
        
        if (this.ortho) {
            let right = vec3.create();
            let up = vec3.create();


            right[0] = -invV[0];
            right[1] = -invV[1];
            right[2] = -invV[2];

            up[0] = -invV[4];
            up[1] = -invV[5];
            up[2] = -invV[6];

            vec3.scale(up, up, (((this.y * 2.0) - 1.0) )*.5);
            vec3.scale(right, right, (-((this.x * 2.0) - 1.0))*.5 * aspect);

            vec3.add(ray.pos, ray.pos, up);
            vec3.add(ray.pos, ray.pos, right);
        }
        
        return ray;
    }

    dragHandleStart() {
        /* Clear temporary handle which may have been added during hold */
        if (this.selectedBSpline != -1) {
            this.splines[this.selectedBSpline].clearTemporaryHandle();
        }

        this.draggingHandle = false;
        this.selectedHandle = -1;

        let ray = this.getRay();

        /* First try to move a handle belonging to the selected spline */
        if (this.selectedBSpline != -1) {
            var ctl_idx = this.splines[this.selectedBSpline].getClickedHandle(ray);
            if (ctl_idx != -1) {
                this.selectedHandle = ctl_idx;
                this.splines[this.selectedBSpline].selectHandle(ctl_idx);
            }
        }


        /* If we werent able to select a handle belonging to the current spline, search through 
        all possible splines. */

        if (this.selectedHandle == -1) {
            for (let i = 0; i < this.splines.length; ++i) {
                var ctl_idx = this.splines[i].getClickedHandle(ray);
                if (ctl_idx != -1) {
                    this.selectedHandle = ctl_idx;
                    if (this.selectedBSpline != -1)
                        this.splines[this.selectedBSpline].deselect();
                    this.selectedBSpline = i;
                    this.splines[i].select();
                    this.splines[i].selectHandle(ctl_idx);
                }
            }
        }

        if ((this.selectedBSpline != -1) && (this.selectedHandle != -1)) {
            this.draggingHandle = true;
            this.originalHandlePos = this.splines[this.selectedBSpline].getHandlePos(this.selectedHandle);
            this.originalClickPos = vec2.fromValues(this.x, this.y);
            this.originalRay = ray;
            if (this.transformEnabled) {
                this.controlPointsCopy = this.splines[this.selectedBSpline].controlPoints[0].slice();
            }
        }
    }

    dragHandle() {
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;

        let invV = mat4.create();
        mat4.invert(invV, this.viewMatrix);

        let cpos = vec3.create();
        let cright = vec3.create();
        let cup = vec3.create();
        let cforward = vec3.create();

        vec3.set(cright, invV[0], invV[1], invV[2]);
        vec3.set(cup, invV[4], invV[5], invV[6]);
        vec3.set(cforward, invV[8], invV[9], invV[10]);
        vec3.set(cpos, invV[12], invV[13], invV[14]);

        if (this.selectedHandle == -1) return;

        let ray = this.getRay();
        let origRay = this.originalRay;
        let newPos = vec3.create();

        
        if (this.ortho) {
            let delta = vec3.create();

            let clickPos = vec2.fromValues(this.x, this.y);
            let deltaClickPos = vec2.create();
            vec3.subtract(deltaClickPos, clickPos, this.originalClickPos);
            deltaClickPos[0] *= aspect;
            deltaClickPos[1] *= -1;
            console.log(deltaClickPos);
            // let dx = (this.x - .5) * aspect;
            // let dy = -(this.y - .5);

            let deltar = vec3.fromValues(cright[0], cright[1], cright[2]);
            let deltau = vec3.fromValues(cup[0], cup[1], cup[2]);

            vec3.scale(deltar, deltar, deltaClickPos[0]);
            vec3.scale(deltau, deltau,  deltaClickPos[1]);
            // vec3.subtract()
            // vec3.subtract(delta, ray.pos, this.originalHandlePos);
            vec3.add(delta, delta, deltau);
            vec3.add(delta, delta, deltar);
            vec3.add(newPos, this.originalHandlePos, delta);
        }
        else {
            let delta = vec3.create();

            let r1 = vec3.create();
            let r2 = vec3.create();
            vec3.set(r1, ray.dir[0], ray.dir[1], ray.dir[2]);
            vec3.set(r2, origRay.dir[0], origRay.dir[1], origRay.dir[2]);
            
            let dist = vec3.dist(ray.pos, this.originalHandlePos);
            
            vec3.scale(r1, r1, dist);
            vec3.scale(r2, r2, dist);
            
            vec3.subtract(delta, r1, r2);
            vec3.add(newPos, this.originalHandlePos, delta);
        }

        // console.log(delta);

        // if (this.editEnabled)
        // {

            if (this.snappingEnabled) {
                newPos[0] = Math.round(10.0 * newPos[0])/10.0;
                newPos[1] = Math.round(10.0 * newPos[1])/10.0;
                newPos[2] = Math.round(10.0 * newPos[2])/10.0;
            }
            this.splines[this.selectedBSpline].moveHandle(this.selectedHandle, newPos);
                // Math.round(100 * (x - this.originalHandlePos[0]))/100,
                // Math.round(100 *(y - this.originalHandlePos[1]))/100 );
        // }
        // if (this.transformEnabled) {
            // let transformedPts = this.controlPointsCopy.slice();
            // for (var i = 0; i < transformedPts.length / 3; ++i) {
                // transformedPts[i * 3 + 0] = Math.round(100 * (this.controlPointsCopy[i * 3 + 0] + deltax))/100; //+ Math.round(100 * ((x - this.originalPosition.x) - this.position.x))/100;
                // transformedPts[i * 3 + 1] = Math.round(100 * (this.controlPointsCopy[i * 3 + 1] + deltay))/100;// + Math.round(100 * ((y - this.originalPosition.y) - this.position.x))/100;
            // }
            // this.splines[this.selectedBSpline].controlPoints = transformedPts;
        // }


        
        // /* Clear temporary handle which may have been added during hold */
        // if (this.selectedBSpline != -1) {
        //     this.splines[this.selectedBSpline].clearTemporaryHandle();
        // }
        
        // this.draggingHandle = false;
        // this.selectedHandle = -1;

        // let ray = this.getRay();

        
        // let tempPos = vec3.create();
        // vec3.add(tempPos, ray.pos, [ray.dir[0] * 10.0, ray.dir[1] * 10.0, ray.dir[2] * 10.0]); // close, but doesn't take into account pan.
       
        // /* Put circle at origin + ray direction */
        // this.splines[this.selectedBSpline].setTemporaryHandle( tempPos[0], tempPos[1], tempPos[2], 1.0, 0.0, 0.0, 1.0);
    }

    dragHandleEnd() {
        this.draggingHandle = false;
        this.backup();
    }

    rotateStart(initialX, initialY, deltaX, deltaY) {
        if (this.panning == false)
            this.rotating = true;
    }

    panStart(initialX, initialY, deltaX, deltaY) {
        if (this.rotating == false)
            this.panning = true;
    }

    dollyStart(initialX, initialY, deltaX, deltaY) {
        console.log("dollyStart is currently unsupported");
    }

    rotate(x, y, deltax, deltay) {
        if (this.rotating)
        {
            this.ddrx = (this.x - this.lastx) * 3.0;
            this.ddry = (this.y - this.lasty) * 3.0;
        }
    }

    pan(x, y, deltax, deltay) {
        if (this.panning)
        {
            this.ddpx = (this.x - this.lastx) * 3.0;
            this.ddpy = (this.y - this.lasty) * 3.0;
        }
    }

    dolly(x, y, deltax, deltay) {
        this.dddx = (this.x - this.lastx) * 2.0;
        this.dddy = (this.y - this.lasty) * 2.0;
    }

    rotateEnd() {
        this.rotating = false;
    }

    panEnd() {
        this.panning = false;
    }

    dollyEnd() {
        console.log("dollyEnd is currently unsupported");
    }

    press(x, y) {
        let ray = this.getRay();

        // if (!this.editEnabled) return;

        var deleting = false;
        let insertion = null;

        console.log("pressing")
        if (this.selectedBSpline != -1) {
            var ctl_idx = this.splines[this.selectedBSpline].getClickedHandle(ray);
            if (ctl_idx == -1) {
                insertion = this.splines[this.selectedBSpline].getInsertionLocation(ray, this.viewMatrix, this.perspectiveMatrix, this.addToFront, this.addToBack, this.addToClosest);
                this.splines[this.selectedBSpline].setTemporaryHandle(insertion.pos, 0.1, 1.0, 0.0, 1.0);
            }
            else {
                let handlePos = this.splines[this.selectedBSpline].getHandlePos(ctl_idx);
                this.splines[this.selectedBSpline].setTemporaryHandle(handlePos, .6, 0.0, 0.0, 1.0);
                deleting = true;
            }
        }

        setTimeout(() => {
            if (this.selectedBSpline != -1) {
                this.splines[this.selectedBSpline].clearTemporaryHandle();
            }

            if (this.mousedown && this.panning == false && this.draggingHandle == false) {
                if (insertion != null) {
                    if (this.pointJustAdded == false) {
                        this.splines[this.selectedBSpline].addHandle(insertion);
                        this.backup();
                    } 
                    this.pointJustAdded = true;
                } else if ((this.pointJustAdded == false) && deleting) {
                    this.selectedHandle = ctl_idx;
                    this.deleteLastHandle();
                    return;
                }
                this.pointJustAdded = false;
            }

        }, deleting ? 600 : 400);

    }

    pressUp() {
        this.pointJustAdded = false;
    }

    doubleTap(x, y) {
        console.log("doubleTap is currently unsupported");
    }

    setSnappingMode(enabled) {
        this.snappingEnabled = enabled;
    }

    setAddMode(addToFront, addToBack, addToClosest) {
        this.addToFront = addToFront;
        this.addToBack = addToBack;
        this.addToClosest = addToClosest;
    }

    newBSpline(gridSize = 5) {
        let invV = mat4.create();
        mat4.invert(invV, this.viewMatrix);

        let cpos = vec3.create();
        let cright = vec3.create();
        let cup = vec3.create();
        let cforward = vec3.create();

        vec3.set(cright, invV[0], invV[1], invV[2]);
        vec3.set(cup, invV[4], invV[5], invV[6]);
        vec3.set(cforward, invV[8], invV[9], invV[10]);
        vec3.set(cpos, invV[12], invV[13], invV[14]);


        let spline = new BSpline(null, cpos[0] - cforward[0], cpos[1] - cforward[1], cpos[2] - cforward[2], gridSize);
        
        spline.show_control_points = this.showControlHandles;
        spline.show_control_polygon = this.showControlPolygons;
        spline.show_mesh = this.showMesh;
        spline.show_bspline = this.showBSplines;
        spline.show_surface = this.showSurface;
        spline.show_knot_values = this.showKnotValues;
        spline.show_node_values = this.showNodes;

        this.splines.push(spline);
        this.backup();

        // console.log("newBSpline is currently unsupported");
    }

    /* Deletes the last clicked handle */
    deleteLastHandle() {
        // if (this.selectedBSpline != -1 && this.selectedHandle != -1) {
        //     if (this.splines[this.selectedBSpline].controlPoints[0].length <= 3) {
        //         this.splines.splice(this.selectedBSpline, 1);
        //         this.selectedBSpline = -1;
        //         this.selectedHandle = -1;
        //     } else {
        //         console.log("Deleting point");
        //         this.splines[this.selectedBSpline].removeHandle(this.selectedHandle);
        //         this.selectedHandle = -1;
        //     }
        //     this.backup();
        // }

    }

    addHandle() {
        console.log("addHandle is currently unsupported");
    }

    /* Deletes the last modified spline */
    deleteLastBSpline() {        
        if (this.selectedBSpline != -1) {
            this.splines.splice(this.selectedBSpline, 1);
            this.selectedBSpline = -1;
            this.selectedHandle = -1;
        }

        this.backup();
    }

    deleteAll() {
        this.splines = [];
        this.selectedBSpline = -1;
        this.selectedHandle = -1;

        this.backup();
    }

    setControlPolygonVisibility(visible) {
        this.showControlPolygons = visible;
        for (var j = 0; j < this.splines.length; ++j) {
            this.splines[j].show_control_polygon = this.showControlPolygons;
            this.splines[j].curve_moved = true;
        }
    }

    setControlHandleVisibility(visible) {
        this.showControlHandles = visible;
        for (var j = 0; j < this.splines.length; ++j) {
            this.splines[j].show_control_points = this.showControlHandles;
            this.splines[j].curve_moved = true;
        }
    }

    setBSplineVisibility(visible) {
        this.showBSplines = visible;
        for (var j = 0; j < this.splines.length; ++j) {
            this.splines[j].show_bspline = this.showBSplines;
            this.splines[j].curve_moved = true;
        }
    }

    setSurfaceVisibility(visible) {
        this.showSurface = visible;
        for (var j = 0; j < this.splines.length; ++j) {
            this.splines[j].show_surface = this.showSurface;
            this.splines[j].curve_moved = true;
        }
    }

    setMeshVisibility(visible) {
        this.showMesh = visible;
        for (var j = 0; j < this.splines.length; ++j) {
            this.splines[j].show_mesh = this.showMesh;
            this.splines[j].curve_moved = true;
        }
    }

    setKnotValueVisibility(visible) {
        this.showKnotValues = visible;
        for (var j = 0; j < this.splines.length; ++j) {
            this.splines[j].show_knot_values = this.showKnotValues;
            this.splines[j].curve_moved = true;
        }
    }

    setNodeVisibility(visible) {
        this.showNodes = visible;
        for (var j = 0; j < this.splines.length; ++j) {
            this.splines[j].show_node_values = this.showNodes;
            this.splines[j].curve_moved = true;
        }
    }

    resetCamera() {
        this.rotX = 3.14 * .25;
        this.rotY = 3.14 * .25;
        this.pos[0] = 0.0;
        this.pos[1] = 0.0;
        this.pos[2] = 0.0;
    }

    lookAtXY() {
        this.rotX = 0.0;
        this.rotY = 0.0;
    }

    lookAtXZ() {
        this.rotX = 0.0;
        this.rotY = 3.14 * .5;
    }

    lookAtYZ() {
        this.rotX = 3.14 * .5;
        this.rotY = 0.0;
    }

    getNumCtlPointsOfSelected() {
        if (this.selectedBSpline == -1)
            return -1;
        else {
            if (this.editingU)
                return this.splines[this.selectedBSpline].getNumUControlPoints();
            else return this.splines[this.selectedBSpline].getNumVControlPoints();
        }
    }

    getSelectedBSpline() {
        if (this.selectedBSpline == -1)
            return -1;
        else {
            return this.splines[this.selectedBSpline];
        }
    }

    render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - this.then;
        this.then = now;
        let gl = this.gl;

        /* Set OpenGL state */
        gl.depthFunc(gl.LEQUAL);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND)
        gl.colorMask(true, true, true, true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        /* Setup the projection */
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        this.perspectiveMatrix = mat4.create();

        let viewDistance = 1.0;

        if (this.ortho) {
            mat4.ortho(this.perspectiveMatrix, -aspect * viewDistance, aspect*viewDistance, -viewDistance, viewDistance, this.near, this.far)
        } else {
            mat4.perspective(this.perspectiveMatrix, this.fovy, aspect, this.near, this.far);
        }
        let eye = vec3.create();
        let center = vec3.create();
        let up = vec3.create();
        vec3.set(eye, 0.0, 0.0, 1.0)
        vec3.set(center, 0.0, 0.0, 0.0)
        vec3.set(up, 0.0, -1.0, 0.0)
        this.viewMatrix = mat4.create();
        mat4.lookAt(this.viewMatrix, eye, center, up);
        
        /* Move the camera */
        
        // mat4.multiply(this.perspectiveMatrix, this.perspectiveMatrix, view);
        mat4.scale(this.viewMatrix, this.viewMatrix, [1.0/this.zoom, 1.0/this.zoom, 1.0/this.zoom]);

        let cpos = vec3.create();
        let cright = vec3.create();
        let cup = vec3.create();
        let cforward = vec3.create();

        vec3.set(cpos, this.viewMatrix[3], this.viewMatrix[7], this.viewMatrix[11]);
        vec3.set(cforward, this.viewMatrix[2], this.viewMatrix[6], this.viewMatrix[10]);
        
        /* Rotation */
        
        vec3.set(cup, this.viewMatrix[4], this.viewMatrix[5], this.viewMatrix[6]);
        mat4.rotate(this.viewMatrix, this.viewMatrix, this.rotX, cup);
        
        vec3.set(cright, this.viewMatrix[0], this.viewMatrix[1], this.viewMatrix[2]);
        mat4.rotate(this.viewMatrix, this.viewMatrix, this.rotY, cright);


        this.rotX += this.drx;
        this.rotY += this.dry;
        
        if (this.rotY > 3.14 * .5) {this.rotY = 3.14 * .5; this.dry = 0; this.ddry = 0;}
        if (this.rotY < -3.14 * .5) {this.rotY = -3.14 * .5; this.dry = 0; this.ddry = 0;}
        // if (this.rotX >= 3.14 * .5) {this.dry = 0; this.ddry = 0;};
        this.rotY = Math.min(this.rotY, 3.14);
        this.rotY = Math.max(this.rotY, -3.14);

        this.drx += this.ddrx;
        this.dry += this.ddry;
        this.ddrx = 0.0;
        this.ddry = 0;
        this.drx *= .8;
        this.dry *= .8;

        /* Translation */
        this.dpx += this.ddpx;
        this.dpy += this.ddpy;
        this.ddpx = 0;
        this.ddpy = 0;
        this.dpx *= .8;
        this.dpy *= .8;

        this.ddx += this.dddx;
        this.ddy += this.dddy;
        this.dddx = 0;
        this.dddy = 0;
        this.ddx *= .8;
        this.ddy *= .8;

        
        vec3.set(cright, this.viewMatrix[0], this.viewMatrix[4], this.viewMatrix[8]);
        vec3.set(cup, this.viewMatrix[1], this.viewMatrix[5], this.viewMatrix[9]);
        vec3.set(cforward, this.viewMatrix[2], this.viewMatrix[6], this.viewMatrix[10]);
        vec3.set(cpos, this.viewMatrix[3], this.viewMatrix[7], this.viewMatrix[11]);

        // vec3.set(cright, this.viewMatrix[0], this.viewMatrix[1], this.viewMatrix[2]);
        // vec3.set(cup, this.viewMatrix[4], this.viewMatrix[5], this.viewMatrix[6]);
        // vec3.set(cforward, this.viewMatrix[8], this.viewMatrix[9], this.viewMatrix[10]);
        // vec3.set(cpos, this.viewMatrix[12], this.viewMatrix[13], this.viewMatrix[14]);

        let speed = this.zoom * this.zoom / 10.0;

        vec3.multiply(cup, cup, [-this.dpy*speed, -this.dpy*speed, -this.dpy*speed]);
        vec3.add(this.pos, this.pos, cup);

        vec3.multiply(cright, cright, [(this.dpx*aspect)*speed, (this.dpx*aspect)*speed, (this.dpx*aspect)*speed]);
        vec3.add(this.pos, this.pos, cright);

        vec3.multiply(cforward, cforward, [(this.ddy*aspect)*speed, (this.ddy*aspect)*speed, (this.ddy*aspect)*speed]);
        vec3.add(this.pos, this.pos, cforward);

        mat4.translate(this.viewMatrix, this.viewMatrix, this.pos);
        
        /* Resize lines */
        for (let i = 0; i < this.splines.length; ++i) {
            if (this.ortho)
                this.splines[i].handle_radius = .03 * this.zoom;//.005;//30 / this.zoom;
            else
                this.splines[i].handle_radius = .015 * this.zoom;//.005;//30 / this.zoom;
            this.splines[i].handle_thickness = .005;//5 / this.zoom;
            this.splines[i].thickness = .01;//5 / this.zoom;
        }

        /* Draw all unselected splines */
        for (let i = 0; i < this.splines.length; ++i) {
            if (!this.splines[i].selected)
                this.splines[i].draw(this.perspectiveMatrix, this.viewMatrix, aspect, now);
        }

        /* Draw all selected splines */
        for (let i = 0; i < this.splines.length; ++i) {
            if (this.splines[i].selected)
                this.splines[i].draw(this.perspectiveMatrix, this.viewMatrix, aspect, now);
        }

        // let iV = mat4.create();
        // mat4.invert()

        // console.log(this.zoom);
        // console.log("X: " + this.viewMatrix[12] +  " Y: " + this.viewMatrix[13] + " Z: " + this.viewMatrix[14] );
        // console.log("X: " + this.viewMatrix[3] +  " Y: " + this.viewMatrix[7] + " Z: " + this.viewMatrix[11] );
        // vec3.set(cpos, VP[12], VP[13], VP[14]);
        gl.colorMask(false, false, false, true);
        gl.clear(gl.COLOR_BUFFER_BIT);
        

    }
}

export { BSplineEditor };