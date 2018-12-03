/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l) {
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [(r), (g), (b)];
}


class BSpline {
    static Initialize(gl) {
        BSpline.gl = gl;

        let bfsSource = "";
        let bvsSource = "";
        let lfsSource = "";
        let lvsSource = "";

        let promises = [];
        promises.push($.ajax({
            url: "./Shaders/BSplineLine.vs",
            success: function (result) {
                bvsSource = result.trim();
            }, error: function (result) {
                console.log("failed to load BSplineLine.vs with error ");
                console.log(result);
            }
        }));
        promises.push($.ajax({
            url: "./Shaders/BSplineLine.fs",
            success: function (result) {
                bfsSource = result.trim();
            }, error: function (result) {
                console.log("failed to load BSplineLine.fs with error ");
                console.log(result);
            }
        }));
        promises.push($.ajax({
            url: "./Shaders/Line.vs",
            success: function (result) {
                lvsSource = result.trim();
            }, error: function (result) {
                console.log("failed to load Line.vs with error ");
                console.log(result);
            }
        }));
        promises.push($.ajax({
            url: "./Shaders/Line.fs",
            success: function (result) {
                lfsSource = result.trim();
            }, error: function (result) {
                console.log("failed to load Line.fs with error ");
                console.log(result);
            }
        }));

        Promise.all(promises).then(() => {
            BSpline.BSplineShaderProgram = BSpline.InitShaderProgram(gl, bvsSource, bfsSource);
            BSpline.BSplineProgramInfo = {
                program: BSpline.BSplineShaderProgram,
                attribLocations: {
                    uv: gl.getAttribLocation(BSpline.BSplineShaderProgram, 'uv'),
                    direction: gl.getAttribLocation(BSpline.BSplineShaderProgram, 'direction'),
                },
                uniformLocations: {
                    projection: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'projection'),
                    modelView: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'modelView'),
                    thickness: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'thickness'),
                    aspect: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'aspect'),
                    miter: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'miter'),
                    controlPoints: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'ControlPoints'),
                    numUControlPoints: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'uNumUControlPoints'),
                    numVControlPoints: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'uNumVControlPoints'),
                    uKnotVector: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'uKnotVector'),
                    vKnotVector: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'vKnotVector'),
                    uKnotIndex: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'uKnotIndex'),
                    vKnotIndex: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'vKnotIndex'),
                    uDegree: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'uDegree'),
                    vDegree: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'vDegree'),
                    tminu: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'tMinU'),
                    tmaxu: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'tMaxU'),
                    tminv: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'tMinV'),
                    tmaxv: gl.getUniformLocation(BSpline.BSplineShaderProgram, 'tMaxV'),
                },
            };

            BSpline.LineShaderProgram = BSpline.InitShaderProgram(gl, lvsSource, lfsSource);
            BSpline.LineProgramInfo = {
                program: BSpline.LineShaderProgram,
                attribLocations: {
                    position: gl.getAttribLocation(BSpline.LineShaderProgram, 'position'),
                    next: gl.getAttribLocation(BSpline.LineShaderProgram, 'next'),
                    previous: gl.getAttribLocation(BSpline.LineShaderProgram, 'previous'),
                    direction: gl.getAttribLocation(BSpline.LineShaderProgram, 'direction'),
                    color: gl.getAttribLocation(BSpline.LineShaderProgram, 'color'),
                },
                uniformLocations: {
                    projection: gl.getUniformLocation(BSpline.LineShaderProgram, 'projection'),
                    modelView: gl.getUniformLocation(BSpline.LineShaderProgram, 'modelView'),
                    thickness: gl.getUniformLocation(BSpline.LineShaderProgram, 'thickness'),
                    aspect: gl.getUniformLocation(BSpline.LineShaderProgram, 'aspect'),
                    miter: gl.getUniformLocation(BSpline.LineShaderProgram, 'miter'),
                    color: gl.getUniformLocation(BSpline.LineShaderProgram, 'ucolor'),
                },
            };
        });
    }

    // Initialize a shader program, so WebGL knows how to draw our data
    static InitShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = BSpline.LoadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = BSpline.LoadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return shaderProgram;
    }

    // creates a shader of the given type, uploads the source and
    // compiles it.
    static LoadShader(gl, type, source) {
        const shader = gl.createShader(type);

        // Send the source to the shader object
        gl.shaderSource(shader, source);

        // Compile the shader program
        gl.compileShader(shader);

        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    constructor(obj = null) {
        this.show_bspline = true;
        this.show_control_polygon = true;
        this.show_control_points = true;
        this.thickness = 5.0;
        this.control_points = (obj == null) ? [
            [-.1, -0.1, 0.0, .1, -0.1, 0.0,],
            [-.1, 0.1, 0.0, .1, 0.1, 0.0,],
        ] : obj.control_points.slice();
        this.temporary_point = []

        this.handle_radius = 50;
        this.handle_thickness = 10.;
        this.handle_samples = 30;
        this.selected = false;
        this.selected_handle = -1;
        this.selected_color = [0.0, 0.0, 0.0, 0.0];
        this.deselected_color = [-.7, -.7, -.7, 0.0];
        this.is_u_open = (obj == null) ? true : obj.is_u_open;
        this.is_u_uniform = (obj == null) ? true : obj.is_u_uniform;
        this.is_v_open = (obj == null) ? true : obj.is_v_open;
        this.is_v_uniform = (obj == null) ? true : obj.is_v_uniform;
        this.u_degree = (obj == null) ? 1 : obj.u_degree;
        this.v_degree = (obj == null) ? 1 : obj.v_degree;
        this.u_knot_vector = (obj == null) ? [0.0, .33, .66, 1.0] : obj.u_knot_vector.slice();
        this.v_knot_vector = (obj == null) ? [0.0, .33, .66, 1.0] : obj.v_knot_vector.slice();
        this.num_samples = 8;

        let numUControlPoints = this.getNumUControlPoints()
        let numVControlPoints = this.getNumVControlPoints()

        if (numVControlPoints != (this.v_knot_vector.length - (this.v_degree + 1))) {
            console.log("Error, V degree/knot_vector/controlPoints mismatch");
        }

        if (numUControlPoints != (this.u_knot_vector.length - (this.u_degree + 1))) {
            console.log("Error, U degree/knot_vector/controlPoints mismatch");
        }
        
        this.updateConstraints();
    }

    toJSON() {
        return {
            control_points: this.control_points,
            u_knot_vector: this.u_knot_vector,
            v_knot_vector: this.v_knot_vector,
            u_degree: this.u_degree,
            v_degree: this.v_degree,
            is_u_open: this.is_u_open,
            is_u_uniform: this.is_u_uniform,
            is_v_open: this.is_v_open,
            is_v_uniform: this.is_v_uniform
        };
    }

    select() {
        this.selected = true;
    }

    selectHandle(selected_handle) {
        this.selected_handle = selected_handle;
    }

    deselect() {
        this.clearTemporaryHandle();
        this.selected = false;
        this.selected_handle = -1;
    }

    getUDegree() {
        return this.u_degree;
    }

    getVDegree() {
        return this.v_degree;
    }

    updateConstraints() {
        /* Normalize the knot vectors */
        for (var i = 0; i < this.u_knot_vector.length; ++i) {
            this.u_knot_vector[i] /= this.u_knot_vector[this.u_knot_vector.length - 1];
        }
        for (var i = 0; i < this.v_knot_vector.length; ++i) {
            this.v_knot_vector[i] /= this.v_knot_vector[this.v_knot_vector.length - 1];
        }
        this.makeKnotVectorUniform();
        this.makeKnotVectorOpen();
    }

// check
    setDegree(degree) {
        let oldDegree = this.u_degree;

        if ((degree >= 1) && (degree <= this.getNumVControlPoints() - 1))
            this.u_degree = degree;
        else return;

        // this.num_samples = 2 * this.u_degree + 20;
        if (this.u_knot_vector == undefined) {
            this.u_knot_vector = [];
        }

        let numKnots = this.getUOrder() + this.getNumVControlPoints();
        if (oldDegree < this.u_degree) {
            for (var i = numKnots - (this.u_degree - oldDegree); i < numKnots; ++i) {
                this.u_knot_vector.push(i / (numKnots - (1 + this.u_degree - oldDegree)));
            }
        } else {
            this.u_knot_vector = this.u_knot_vector.slice(0, numKnots);
        }

        for (var i = 0; i < numKnots; ++i) {
            this.u_knot_vector[i] /= this.u_knot_vector[this.u_knot_vector.length - 1];
        }
        this.updateConstraints();
    }

    makeKnotVectorUniform() {
        if (this.is_u_uniform) {
            this.u_knot_vector = [];
            let numKnots = this.getUOrder() + this.getNumUControlPoints();
            for (var i = 0; i < numKnots; ++i) {
                this.u_knot_vector.push(i / (numKnots - 1));
            }
        }

        if (this.is_v_uniform) {
            this.v_knot_vector = [];
            let numKnots = this.getVOrder() + this.getNumVControlPoints();
            for (var i = 0; i < numKnots; ++i) {
                this.v_knot_vector.push(i / (numKnots - 1));
            }
        }
    }

    makeKnotVectorOpen() {
        if (this.is_u_open) {

            let numKnots = this.getUOrder() + this.getNumUControlPoints();
            var lower = this.u_knot_vector[this.u_degree];
            var upper = this.u_knot_vector[this.u_knot_vector.length - 1 - (this.u_degree)];

            for (var i = 0; i < numKnots; ++i) {
                this.u_knot_vector[i] -= lower;
                this.u_knot_vector[i] /= (upper - lower);
            }

            for (var i = 0; i < this.u_degree; ++i) {
                this.u_knot_vector[i] = 0.0;
            }

            for (var i = this.u_knot_vector.length - (this.u_degree); i < this.u_knot_vector.length; ++i) {
                this.u_knot_vector[i] = 1.0;
            }
        }

        if (this.is_v_open) {

            let numKnots = this.getVOrder() + this.getNumVControlPoints();
            var lower = this.v_knot_vector[this.v_degree];
            var upper = this.v_knot_vector[this.v_knot_vector.length - 1 - (this.v_degree)];

            for (var i = 0; i < numKnots; ++i) {
                this.v_knot_vector[i] -= lower;
                this.v_knot_vector[i] /= (upper - lower);
            }

            for (var i = 0; i < this.v_degree; ++i) {
                this.v_knot_vector[i] = 0.0;
            }

            for (var i = this.v_knot_vector.length - (this.v_degree); i < this.v_knot_vector.length; ++i) {
                this.v_knot_vector[i] = 1.0;
            }
        }

        this.checkUpperEndConditions();
    }

    checkUpperEndConditions() {
        if (this.is_u_open) {

            var is_u_open = true;
            var lastVal = this.u_knot_vector[this.u_knot_vector.length - 1];
            for (var i = this.u_knot_vector.length - 2; i >= this.u_knot_vector.length - (this.u_degree + 1); i--) {
                if (this.u_knot_vector[i] != lastVal) {
                    is_u_open = false;
                    break;
                }
            }

            if (is_u_open) {
                let other = lastVal;
                /* Try to find the first value which doesn't equal the last */
                for (var i = this.u_knot_vector.length - 1; i >= 0; --i) {
                    if (this.u_knot_vector[i] != lastVal) {
                        other = this.u_knot_vector[i];
                        break;
                    }
                }

                this.u_knot_vector[this.u_knot_vector.length - 1] += .05;
                for (var i = 0; i < this.u_knot_vector.length; ++i) {
                    this.u_knot_vector[i] /= this.u_knot_vector[this.u_knot_vector.length - 1];
                }
            }
        }


        if (this.is_v_open) {

            var is_v_open = true;
            var lastVal = this.v_knot_vector[this.v_knot_vector.length - 1];
            for (var i = this.v_knot_vector.length - 2; i >= this.v_knot_vector.length - (this.v_degree + 1); i--) {
                if (this.v_knot_vector[i] != lastVal) {
                    is_v_open = false;
                    break;
                }
            }

            if (is_v_open) {
                let other = lastVal;
                /* Try to find the first value which doesn't equal the last */
                for (var i = this.v_knot_vector.length - 1; i >= 0; --i) {
                    if (this.v_knot_vector[i] != lastVal) {
                        other = this.v_knot_vector[i];
                        break;
                    }
                }

                this.v_knot_vector[this.v_knot_vector.length - 1] += .05;
                for (var i = 0; i < this.v_knot_vector.length; ++i) {
                    this.v_knot_vector[i] /= this.v_knot_vector[this.v_knot_vector.length - 1];
                }
            }
        }

    }

    setUUniformity(is_u_uniform) {
        this.is_u_uniform = is_u_uniform;
        this.updateConstraints();
    }

    setVUniformity(is_v_uniform) {
        this.is_v_uniform = is_v_uniform;
        this.updateConstraints();
    }

    setUOpen(is_u_open) {
        this.is_u_open = is_u_open;
        this.updateConstraints();
    }

    setVOpen(is_v_open) {
        this.is_v_open = is_v_open;
        this.updateConstraints();
    }

    getUOrder() {
        return this.u_degree + 1;
    }

    getVOrder() {
        return this.v_degree + 1;
    }

    updateBuffers(projection, viewMatrix, aspect, time) {
        /* REFACTOR THIS */
        let invV = mat4.create();
        mat4.invert(invV, viewMatrix);

        let cpos = vec3.create();
        let cright = vec3.create();
        let cup = vec3.create();
        let cforward = vec3.create();

        vec3.set(cright, invV[0], invV[1], invV[2]);
        vec3.set(cup, invV[4], invV[5], invV[6]);
        vec3.set(cforward, invV[8], invV[9], invV[10]);
        vec3.set(cpos, invV[12], invV[13], invV[14]);

        vec3.normalize(cright, cright);
        vec3.normalize(cup, cup);

        let gl = BSpline.gl;

        if (!this.buffers) {
            this.buffers = []
        }

        for (var s = 0; s < this.getNumUControlPoints(); ++s) {
            if (this.buffers[s] == undefined) {
                this.buffers[s] = {};
                this.buffers[s].uv = gl.createBuffer();
                this.buffers[s].tDirection = gl.createBuffer();
                this.buffers[s].controlPointsPosition = gl.createBuffer();
                this.buffers[s].controlPointsNext = gl.createBuffer();
                this.buffers[s].controlPointsPrevious = gl.createBuffer();
                this.buffers[s].controlPointsDirection = gl.createBuffer();
                this.buffers[s].controlPointsColors = gl.createBuffer();

                this.buffers[s].handlePointsPosition = gl.createBuffer();
                this.buffers[s].handlePointsNext = gl.createBuffer();
                this.buffers[s].handlePointsPrevious = gl.createBuffer();
                this.buffers[s].handlePointsDirection = gl.createBuffer();
                this.buffers[s].handlePointsIndices = gl.createBuffer();
                this.buffers[s].handlePointsColors = gl.createBuffer();
            }


            let uv = this.getUVValues();

            /* Double each uv, adding a direction */
            let tDirection = [];
            let doubleUVs = [];
            for (var i = 0; i < uv.length / 2; ++i) {
                tDirection.push(-1, 1)
                doubleUVs.push(uv[i * 2 + 0], uv[i * 2 + 1])
                doubleUVs.push(uv[i * 2 + 0], uv[i * 2 + 1])
            }

            let next = [];
            let prev = [];
            let pos = [];
            let ctlDirection = []
            let controlPointColors = []

            /* Creates a line following a fixed U value */
            for (var i = 0; i < this.getNumVControlPoints(); ++i) {
                let iprev = Math.max(i - 1, 0);
                let inext = Math.min(i + 1, this.getNumVControlPoints() - 1);
                
                let next_pos = this.getHandlePosFromUV(s, inext);
                let prev_pos = this.getHandlePosFromUV(s, iprev);
                let curr_pos = this.getHandlePosFromUV(s, i);

                next.push(next_pos[0], next_pos[1], next_pos[2], next_pos[0], next_pos[1], next_pos[2]);
                prev.push(prev_pos[0], prev_pos[1], prev_pos[2], prev_pos[0], prev_pos[1], prev_pos[2]);
                pos.push(curr_pos[0], curr_pos[1], curr_pos[2], curr_pos[0], curr_pos[1], curr_pos[2]);

                controlPointColors.push(1.0, 1.0, 1.0, 1.0);
                controlPointColors.push(1.0, 1.0, 1.0, 1.0);
                controlPointColors.push(1.0, 1.0, 1.0, 1.0);
                
                ctlDirection.push(-1, 1);
            }

            /* Create lines for control point handles */
            // let center = vec3.create();
            // vec3.set(center, this.control_points[i * 3 + 0], this.control_points[i * 3 + 1], this.control_points[i * 3 + 2])
            var i = 0;
            let handlePoints = [];
            let handlePointsPrev = [];
            let handlePointsNext = [];
            let handlePointsDirection = [];
            let handlePointsIndices = [];
            let handlePointColors = [];
            let temppts = this.control_points[s].slice();
            if (this.temporary_point.length != 0) {
                temppts.push(this.temporary_point[0], this.temporary_point[1], this.temporary_point[2]);
            }

            /* For each point on a line following a fixed U */
            for (var i = 0; i < this.getNumVControlPoints(); ++i) {

                /* For a set of samples following a circle */
                for (var j = 0; j <= this.handle_samples; ++j) {
                    let jprev = Math.max(j - 1, 0);
                    let jnext = Math.min(j + 1, this.handle_samples);

                    /* Compute angles */
                    let anglePrev = (jprev / (1.0 * this.handle_samples - 1)) * 2 * Math.PI;
                    let angle = (j / (1.0 * this.handle_samples - 1)) * 2 * Math.PI;
                    let angleNext = (jnext / (1.0 * this.handle_samples - 1)) * 2 * Math.PI;

                    /* Customize this if we need to know if a handle is selected. */
                    let rad = this.handle_radius;
                    let handlePos = this.getHandlePosFromUV(s, i);

                    /* For view aligned stuff */
                    let prevDelta = vec3.create();
                    let currDelta = vec3.create();
                    let nextDelta = vec3.create();
                    let scaledRight = vec3.create();
                    let scaledUp = vec3.create();

                    scaledRight = vec3.fromValues(cright[0], cright[1], cright[2]);
                    scaledUp = vec3.fromValues(cup[0], cup[1], cup[2]);
                    vec3.scale(scaledRight, scaledRight, Math.cos(anglePrev) * rad);
                    vec3.scale(scaledUp, scaledUp, Math.sin(anglePrev) * rad);
                    vec3.add(prevDelta, scaledRight, scaledUp);

                    scaledRight = vec3.fromValues(cright[0], cright[1], cright[2]);
                    scaledUp = vec3.fromValues(cup[0], cup[1], cup[2]);
                    vec3.scale(scaledRight, scaledRight, Math.cos(angle) * rad);
                    vec3.scale(scaledUp, scaledUp, Math.sin(angle) * rad);
                    vec3.add(currDelta, scaledRight, scaledUp);

                    scaledRight = vec3.fromValues(cright[0], cright[1], cright[2]);
                    scaledUp = vec3.fromValues(cup[0], cup[1], cup[2]);
                    vec3.scale(scaledRight, scaledRight, Math.cos(angleNext) * rad);
                    vec3.scale(scaledUp, scaledUp, Math.sin(angleNext) * rad);
                    vec3.add(nextDelta, scaledRight, scaledUp);

                    /* Compute final positions */
                    handlePointsPrev.push(handlePos[0] + prevDelta[0], handlePos[1] + prevDelta[1], handlePos[2] + prevDelta[2]);
                    handlePointsPrev.push(handlePos[0] + prevDelta[0], handlePos[1] + prevDelta[1], handlePos[2] + prevDelta[2]);

                    handlePoints.push(handlePos[0] + currDelta[0], handlePos[1] + currDelta[1], handlePos[2] + currDelta[2]);
                    handlePoints.push(handlePos[0] + currDelta[0], handlePos[1] + currDelta[1], handlePos[2] + currDelta[2]);

                    handlePointsNext.push(handlePos[0] + nextDelta[0], handlePos[1] + nextDelta[1], handlePos[2] + nextDelta[2]);
                    handlePointsNext.push(handlePos[0] + nextDelta[0], handlePos[1] + nextDelta[1], handlePos[2] + nextDelta[2]);

                    /* Directions */
                    handlePointsDirection.push(-1, 1 * (this.selected_handle == i) ? 4 : 1);

                    /* Colors */
                    var rgb = hslToRgb(i * (1.0 / this.getNumVControlPoints()), 1., .5);;
                    handlePointColors.push(rgb[0], rgb[1], rgb[2], 1.0);
                    handlePointColors.push(rgb[0], rgb[1], rgb[2], 1.0);

                     /* Indices */
                     if (j != this.handle_samples) {
                        let offset = 2 * (this.handle_samples + 1) * i; // 2 points per point. 6 floats per point. handle_samples + 1 points. 
                        // handlePointsIndices.push((handlePoints.length/3) -  j * 2 + (i * this.handle_samples + 1), j*2+1 + (i * this.handle_samples + 1));
                        /* each two points creates two triangles in our strip. */
                        handlePointsIndices.push(j * 2 + offset, j * 2 + 2 + offset, j * 2 + 1 + offset, j * 2 + 2 + offset, j * 2 + 3 + offset, j * 2 + 1 + offset); // first pt, second pt
                    }
                }
            }

            // for (var i = 0; i < temppts.length / 3; ++i) {
            //     for (var j = 0; j < this.handle_samples + 1; ++j) {
            //         let jprev = Math.max(j - 1, 0);
            //         let jnext = Math.min(j + 1, this.handle_samples);

            //         let degreePrev = (jprev / (1.0 * this.handle_samples - 1)) * 2 * Math.PI;
            //         let degree = (j / (1.0 * this.handle_samples - 1)) * 2 * Math.PI;
            //         let degreeNext = (jnext / (1.0 * this.handle_samples - 1)) * 2 * Math.PI;

            //         let rad = (i == this.selected_handle) ? this.handle_radius * 1.0 : this.handle_radius;
            //         if ((i == ((temppts.length / 3) - 1)) && (this.temporary_point.length != 0)) {
            //             rad *= 1.2;
            //         }

            //         let handlePos = vec3.create();
            //         if ((i == ((temppts.length / 3) - 1)) && (this.temporary_point.length != 0)) {
            //             handlePos = vec3.fromValues(this.temporary_point[0], this.temporary_point[1], this.temporary_point[2]);
            //         } else {
            //             handlePos = this.getHandlePosFromUV(s, i);
            //         }

            //         let prevDelta = vec3.create();
            //         let currDelta = vec3.create();
            //         let nextDelta = vec3.create();
            //         let scaledRight = vec3.create();
            //         let scaledUp = vec3.create();

            //         scaledRight = vec3.fromValues(cright[0], cright[1], cright[2]);
            //         scaledUp = vec3.fromValues(cup[0], cup[1], cup[2]);
            //         vec3.scale(scaledRight, scaledRight, Math.cos(degreePrev) * rad);
            //         vec3.scale(scaledUp, scaledUp, Math.sin(degreePrev) * rad);
            //         vec3.add(prevDelta, scaledRight, scaledUp);

            //         scaledRight = vec3.fromValues(cright[0], cright[1], cright[2]);
            //         scaledUp = vec3.fromValues(cup[0], cup[1], cup[2]);
            //         vec3.scale(scaledRight, scaledRight, Math.cos(degree) * rad);
            //         vec3.scale(scaledUp, scaledUp, Math.sin(degree) * rad);
            //         vec3.add(currDelta, scaledRight, scaledUp);

            //         scaledRight = vec3.fromValues(cright[0], cright[1], cright[2]);
            //         scaledUp = vec3.fromValues(cup[0], cup[1], cup[2]);
            //         vec3.scale(scaledRight, scaledRight, Math.cos(degreeNext) * rad);
            //         vec3.scale(scaledUp, scaledUp, Math.sin(degreeNext) * rad);
            //         vec3.add(nextDelta, scaledRight, scaledUp);

            //         /* Positions */
            //         handlePointsPrev.push(handlePos[0] + prevDelta[0], handlePos[1] + prevDelta[1], handlePos[2] + prevDelta[2]);
            //         handlePointsPrev.push(handlePos[0] + prevDelta[0], handlePos[1] + prevDelta[1], handlePos[2] + prevDelta[2]);

            //         handlePoints.push(handlePos[0] + currDelta[0], handlePos[1] + currDelta[1], handlePos[2] + currDelta[2]);
            //         handlePoints.push(handlePos[0] + currDelta[0], handlePos[1] + currDelta[1], handlePos[2] + currDelta[2]);

            //         handlePointsNext.push(handlePos[0] + nextDelta[0], handlePos[1] + nextDelta[1], handlePos[2] + nextDelta[2]);
            //         handlePointsNext.push(handlePos[0] + nextDelta[0], handlePos[1] + nextDelta[1], handlePos[2] + nextDelta[2]);

            //         /* Directions */
            //         handlePointsDirection.push(-1, 1 * (this.selected_handle == i) ? 4 : 1);

            //         /* Colors */
            //         if ((i == ((temppts.length / 3) - 1)) && (this.temporary_point.length != 0)) {
            //             handlePointColors.push(this.temporaryPointColor[0], this.temporaryPointColor[1], this.temporaryPointColor[2], this.temporaryPointColor[3]);
            //             handlePointColors.push(this.temporaryPointColor[0], this.temporaryPointColor[1], this.temporaryPointColor[2], this.temporaryPointColor[3]);
            //             // handlePointColors.push(this.temporaryPointColor[0], this.temporaryPointColor[1], this.temporaryPointColor[2], this.temporaryPointColor[3]);
            //         }
            //         else {
            //             var rgb = hslToRgb(i * (1.0 / this.getNumVControlPoints()), 1., .5);;
            //             // this.lines[i].color = [rgb[0], rgb[1], rgb[2], 1.0];

            //             handlePointColors.push(rgb[0], rgb[1], rgb[2], 1.0);
            //             handlePointColors.push(rgb[0], rgb[1], rgb[2], 1.0);
            //             // handlePointColors.push(1.0, 1.0, 1.0, 1.0);
            //         }

            //         /* Indices */
            //         if (j != this.handle_samples) {
            //             let offset = 2 * (this.handle_samples + 1) * i; // 2 points per point. 6 floats per point. handle_samples + 1 points. 
            //             // handlePointsIndices.push((handlePoints.length/3) -  j * 2 + (i * this.handle_samples + 1), j*2+1 + (i * this.handle_samples + 1));
            //             /* each two points creates two triangles in our strip. */
            //             handlePointsIndices.push(j * 2 + offset, j * 2 + 2 + offset, j * 2 + 1 + offset, j * 2 + 2 + offset, j * 2 + 3 + offset, j * 2 + 1 + offset); // first pt, second pt
            //         }
            //     }
            // }

            /* Control points */
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].tDirection);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tDirection), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].uv);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(doubleUVs), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsPrevious);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prev), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsPosition);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsNext);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(next), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsDirection);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctlDirection), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsColors);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(controlPointColors), gl.STATIC_DRAW)

            /* Handles */
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsPosition);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePoints), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsNext);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointsNext), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsPrevious);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointsPrev), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsDirection);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointsDirection), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[s].handlePointsIndices);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(handlePointsIndices), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsColors);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointColors), gl.STATIC_DRAW)
        }
    }

    getTValues() {
        let ts = []
        for (let i = 0; i < this.num_samples; ++i) {
            ts.push(i / (this.num_samples - 1));
        }
        return ts;
    }

    getUVValues() {
        let uv = []
        for (let y = 0; y < this.num_samples; ++y) {
            for (let x = 0; x < this.num_samples; ++x) {
                if (y % 2 == 0) {
                    // 0
                    uv.push(x / (this.num_samples));
                    uv.push(y / (this.num_samples));
                    // 1
                    uv.push((x + 1) / (this.num_samples));
                    uv.push((y + 1) / (this.num_samples));
                    // 2
                    uv.push((x + 1) / (this.num_samples));
                    uv.push(y / (this.num_samples));
                    // 3
                    uv.push(x / (this.num_samples));
                    uv.push(y / (this.num_samples));
                    // 4
                    uv.push(x / (this.num_samples));
                    uv.push((y + 1) / (this.num_samples));
                    // 5
                    uv.push((x + 1) / (this.num_samples));
                    uv.push((y + 1) / (this.num_samples));
                } else {
                    // 0
                    uv.push((((this.num_samples - 1) - x) + 1) / (this.num_samples));
                    uv.push(y / (this.num_samples));
                    // 1
                    uv.push((((this.num_samples - 1) - x)) / (this.num_samples));
                    uv.push((y + 1) / (this.num_samples));
                    // 2
                    uv.push((((this.num_samples - 1) - x)) / (this.num_samples));
                    uv.push((y) / (this.num_samples));
                    // 3
                    uv.push((((this.num_samples - 1) - x) + 1) / (this.num_samples));
                    uv.push(y / (this.num_samples));
                    // 4
                    uv.push((((this.num_samples - 1) - x) + 1) / (this.num_samples));
                    uv.push((y + 1) / (this.num_samples));
                    // 5
                    uv.push((((this.num_samples - 1) - x)) / (this.num_samples));
                    uv.push((y + 1) / (this.num_samples));
                }

            }
        }
        return uv;
    }

    intersectSphere(origin, dir, center, radius) {
        var offset = vec3.create()
        vec3.subtract(offset, origin, center);
        var a = vec3.dot(dir, dir);
        var b = 2 * vec3.dot(dir, offset);
        var c = vec3.dot(offset, offset) - radius * radius;
        var discriminant = b * b - 4 * a * c;

        if (discriminant > 0) {
            return true;
            // var t = (-b - Math.sqrt(discriminant)) / (2 * a);
            // var hit = vec3.create();
            // vec3.add(hit, origin, (ray[0] * t, ray[1] * t, ray[2] * t));
            // return new HitTest(t, hit, hit.subtract(center).divide(radius));
        }
        return false;
    }

    sqr(x) { return x * x }

    dist2(v, w) { return this.sqr(v[0] - w[0]) + this.sqr(v[1] - w[1]) }

    distToSegmentSquared(p, v, w) {
        var l2 = this.dist2(v, w);
        if (l2 == 0) return this.dist2(p, v);
        var t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
        t = Math.max(0, Math.min(1, t));
        return this.dist2(p, [v[0] + t * (w[0] - v[0]),
        v[1] + t * (w[1] - v[1])]);
    }

    distToSegment(p, v, w) { return Math.sqrt(this.distToSegmentSquared(p, v, w)); }

    getClickedHandle(ray) {
        for (var u_idx = 0; u_idx < this.getNumUControlPoints(); ++u_idx) {
            for (var v_idx = 0; v_idx < this.getNumVControlPoints(); ++v_idx) {
                /* Ray sphere intersection here... */
                let handle_pos = this.getHandlePosFromUV(u_idx, v_idx);
                let result = this.intersectSphere(ray.pos, ray.dir, 
                    [handle_pos[0], handle_pos[1], handle_pos[2]], 
                    this.handle_radius * 1.5);

                if (result == true)
                    return (u_idx * this.getNumVControlPoints()) + v_idx;
            }
        }
        return -1;
    }

    // getSnapPosition(x, y, selectedIsCurrent, currentHandle, snapToX, snapToY) {
    //     if ((snapToX == false) && (snapToY == false)) return -1;

    //     for (var i = 0; i < this.getNumVControlPoints(); ++i) {
    //         if (selectedIsCurrent && currentHandle == i) continue;

    //         var deltaX = x - this.control_points[0][3 * i + 0];
    //         var deltaY = y - this.control_points[0][3 * i + 1];

    //         if (snapToX && !snapToY) {
    //             if (Math.abs(deltaX) * .9 < (this.handle_radius))
    //                 return i;
    //         }

    //         else if (snapToY && !snapToX) {
    //             if (Math.abs(deltaY) * .9 < (this.handle_radius))
    //                 return i;
    //         }

    //         else {
    //             var distSqrd = deltaX * deltaX + deltaY * deltaY;
    //             if (distSqrd * .9 < (this.handle_radius * this.handle_radius))
    //                 return i;
    //         }
    //     }
    //     return -1;
    // }

    getNumUControlPoints() {
        return this.control_points.length;
    }

    getNumVControlPoints() {
        return this.control_points[0].length / 3;
    }

    getU(idx) {
        let numVControlPoints = this.getNumVControlPoints();
        return Math.floor(idx / numVControlPoints);
    }

    getV(idx) {
        let numVControlPoints = this.getNumVControlPoints();
        return idx % numVControlPoints;
    }

    moveHandle(handleIdx, pos) {
        let u = this.getU(handleIdx);
        let v = this.getV(handleIdx);
        this.control_points[u][3 * v + 0] = pos[0];
        this.control_points[u][3 * v + 1] = pos[1];
        this.control_points[u][3 * v + 2] = pos[2];
    }

    // removeHandle(handleIdx) {
    //     this.control_points[0].splice(handleIdx * 3, 3);
    //     this.u_knot_vector.splice(handleIdx, 1);
    //     this.selected_handle = -1;
    //     if (this.getUOrder() > this.getNumVControlPoints()) {
    //         this.setDegree(this.getUDegree() - 1);
    //     }

    //     this.updateConstraints();
    // }

    getInsertionLocation(ray, viewMatrix, projectionMatrix, insertionMode) {
        let insertion = {
            pos: [0, 0, 0],
            delta: [0, 0, 0],
            referenceU: 0,
            referenceV: 0,
            insertU: 0,
            insertV: 0,
            uKnot: 0,
            vKnot: 0,
            insertionMode: insertionMode
        };

        let insertionPos = vec3.create();
        let insertionDelta = vec3.create();

        /* V insertion (last) */
        if (insertionMode == 0) {
            let distance = vec3.dist(ray.pos, this.getHandlePosFromUV(0, 0));
            insertionPos = vec3.fromValues(ray.dir[0], ray.dir[1], ray.dir[2]);
            vec3.scale(insertionPos, insertionPos, distance);
            vec3.add(insertionPos, insertionPos, ray.pos);
            insertion.pos = insertionPos;
            insertion.insertU = 0;
            insertion.insertV = this.getNumVControlPoints();
            insertion.referenceU = 0
            insertion.referenceV = insertion.insertV - 1;
            /* TODO: Should search to determine closest v point */
            vec3.subtract(insertionDelta, insertionPos, 
                [this.control_points[0][insertion.referenceV * 3 + 0], 
                this.control_points[0][insertion.referenceV * 3 + 1], 
                this.control_points[0][insertion.referenceV * 3 + 2]]);

            insertion.vknot = 1.5;
            insertion.delta = insertionDelta;
        }
        /* V insertion (first) */
        else if (insertionMode == 1) {
            let distance = vec3.dist(ray.pos, this.getHandlePosFromUV(0, this.getNumVControlPoints()-1));
            insertionPos = vec3.fromValues(ray.dir[0], ray.dir[1], ray.dir[2]);
            vec3.scale(insertionPos, insertionPos, distance);
            vec3.add(insertionPos, insertionPos, ray.pos);
            insertion.pos = insertionPos;
            insertion.insertU = 0;
            insertion.insertV = 0;
            insertion.referenceU = 0
            insertion.referenceV = 0;
            /* TODO: Should search to determine closest v point */
            vec3.subtract(insertionDelta, insertionPos, 
                [this.control_points[0][0], 
                this.control_points[0][1], 
                this.control_points[0][2]]);
            insertion.delta = insertionDelta;

            insertion.vknot = -.5
        }

        /* U insertion (last) */
        else if (insertionMode == 2) {
            let distance = vec3.dist(ray.pos, this.getHandlePosFromUV(0, 0));
            insertionPos = vec3.fromValues(ray.dir[0], ray.dir[1], ray.dir[2]);
            vec3.scale(insertionPos, insertionPos, distance);
            vec3.add(insertionPos, insertionPos, ray.pos);
            insertion.pos = insertionPos;
            insertion.insertU = 0;
            insertion.insertV = 0;
            insertion.referenceU = 0
            insertion.referenceV = 0;
            /* TODO: Should search to determine closest v point */
            vec3.subtract(insertionDelta, insertionPos, 
                [this.control_points[insertion.referenceU][0], 
                this.control_points[insertion.referenceU][1], 
                this.control_points[insertion.referenceU]][2]);

            insertion.uknot = 1.5;
            insertion.delta = insertionDelta;
        }

        /* U insertion (fisrt) */
        else if (insertionMode == 3) {
            let distance = vec3.dist(ray.pos, this.getHandlePosFromUV(this.getNumUControlPoints()-1, 0));
            insertionPos = vec3.fromValues(ray.dir[0], ray.dir[1], ray.dir[2]);
            vec3.scale(insertionPos, insertionPos, distance);
            vec3.add(insertionPos, insertionPos, ray.pos);
            insertion.pos = insertionPos;
            insertion.insertU = this.getNumUControlPoints();
            insertion.insertV = 0;
            insertion.referenceU = insertion.insertU - 1;
            insertion.referenceV = 0;
            /* TODO: Should search to determine closest v point */
            vec3.subtract(insertionDelta, insertionPos, 
                [this.control_points[insertion.referenceU][0], 
                this.control_points[insertion.referenceU][1], 
                this.control_points[insertion.referenceU][2]]);
            insertion.delta = insertionDelta;

            insertion.uknot = -.5
        }

        /* TODO: allow insertion on U */

        // else if (insertionMode = 4) {
        //     var closest = -1;
        //     var closestDistance = Number.MAX_VALUE;
        //     let VP = mat4.create()
        //     mat4.multiply(VP, projectionMatrix, viewMatrix);

        //     let screenPoint = vec4.create();
        //     vec4.add(screenPoint, [ray.pos[0], ray.pos[1], ray.pos[2], 1.0], [ray.dir[0], ray.dir[1], ray.dir[2], 0.0]);
        //     vec4.transformMat4(screenPoint, screenPoint, VP);
        //     vec4.scale(screenPoint, screenPoint, 1.0 / screenPoint[3])

        //     /* For each control point */
        //     for (var i = 0; i < (this.getNumVControlPoints() - 1); ++i) {

        //         /* Project the control points */
        //         var v = this.getHandlePos(i);
        //         var w = this.getHandlePos(i + 1);
        //         vec4.transformMat4(v, v, VP);
        //         vec4.transformMat4(w, w, VP);

        //         vec4.scale(v, v, 1.0 / v[3])
        //         vec4.scale(w, w, 1.0 / w[3])

        //         /* Now get distance in screen space */
        //         var distance = this.distToSegment([screenPoint[0], screenPoint[1]], [v[0], v[1]], [w[0], w[1]]);

        //         if (distance < closestDistance) {

        //             /* Compute screen space vector along segment */
        //             let v1 = vec2.fromValues(v[0], v[1]);
        //             vec2.subtract(v1, v1, [w[0], w[1]]);

        //             /* Compute screen space vector from w to clicked point */
        //             let v2 = vec2.fromValues(screenPoint[0], screenPoint[1]);
        //             vec2.subtract(v2, v2, [w[0], w[1]]);

        //             /* Compute dot between those, gives us projection of clicked onto segment */
        //             let dot = vec2.dot(v1, v2);
        //             let len = vec2.length(v1);

        //             /* Determine alpha by how far along that segment this projection lies. */
        //             let alpha = dot / len;

        //             /* Now use world space segment */
        //             var v_w = this.getHandlePos(i);
        //             var w_w = this.getHandlePos(i + 1);

        //             /* Interpolate between those world space locations using alpha */
        //             var interp = vec4.create();
        //             vec4.lerp(interp, v_w, w_w, 1.0 - alpha);

        //             /* Compute vector from camera pos to the interpolated point */
        //             let v3 = vec4.create();
        //             vec4.set(v3, ray.pos[0], ray.pos[1], ray.pos[2], 1.0);
        //             vec4.subtract(v3, interp, v3);

        //             /* Normalize that vector */
        //             let v4 = vec4.create();
        //             vec4.normalize(v4, v3);

        //             /* Compute normal vector along ray direction  */
        //             let v5 = vec4.create();
        //             vec4.set(v5, ray.dir[0], ray.dir[1], ray.dir[2], 0.0);
        //             vec4.normalize(v5, v5)

        //             /* Dot between normalized vectors tells us cos angle between them */

        //             let cosOfAngle = vec4.dot(v5, v4);

        //             /* Distance from the camera to the interpolated point */
        //             let distToInterpPoint = vec4.length(v3);

        //             /* Some trig, right triangle between camera to clicked and camera to interp pos, 
        //                 cos times hypotenuse gives adjacent magnitude */
        //             let finalDist = cosOfAngle * distToInterpPoint;

        //             /* Final Dist is magnitute along ray.dir */

        //             closestDistance = distance;
        //             closest = i;
        //             insertion.idx = closest + 1;
        //             insertion.knot = .5; // FOR NOW
        //             insertion.pos = vec3.fromValues(ray.pos[0], ray.pos[1], ray.pos[2]);
        //             vec3.add(insertion.pos, insertion.pos, [ray.dir[0] * finalDist, ray.dir[1] * finalDist, ray.dir[2] * finalDist])
        //         }
        //     }

        //     // if (closest != -1) {

        //     //     this.control_points[0].splice((closest + 1) * 3, 0, x, y, 0.0);
        //     //     let t = (this.u_knot_vector[closest] + this.u_knot_vector[closest + 1]) / 2.0;
        //     //     insertion.knot = t;
        //     // }
        // }

        return insertion;
    }

    addHandle(insertion_data) {

        // let pos = insertion_data.pos;
        let uknot = insertion_data.uknot;
        let vknot = insertion_data.vknot;

        /* V insertion */
        if (insertion_data.insertionMode < 2) {
            for (var v_idx = 0; v_idx < this.getNumVControlPoints(); ++v_idx) {
                var pos = vec3.fromValues(
                    this.control_points[insertion_data.referenceU][v_idx * 3 + 0], 
                    this.control_points[insertion_data.referenceU][v_idx * 3 + 1], 
                    this.control_points[insertion_data.referenceU][v_idx * 3 + 2]);

                vec3.add(pos, pos, insertion_data.delta);
                this.control_points[insertion_data.referenceU].splice(insertion_data.insertV * 3, 0, pos[0], pos[1], pos[2]);
            }
            this.v_knot_vector.splice(insertion_data.insertV, 0, vknot);
        }

        /* U insertion */
        else if (insertion_data.insertionMode < 4) {
            let newPts = [];
            for (var u_idx = 0; u_idx < this.getNumUControlPoints(); ++u_idx) {
                var pos = vec3.fromValues(
                    this.control_points[u_idx][insertion_data.referenceV * 3 + 0], 
                    this.control_points[u_idx][insertion_data.referenceV * 3 + 1], 
                    this.control_points[u_idx][insertion_data.referenceV * 3 + 2]);

                vec3.add(pos, pos, insertion_data.delta);
                newPts.push(pos[0], pos[1], pos[2]);
            }
            this.control_points.splice(insertion_data.insertU, 0, newPts);
            this.u_knot_vector.splice(insertion_data.insertU, 0, uknot);
        }

        this.updateConstraints();
    }

    setTemporaryHandle(pos, r, g, b, a) {
        this.temporary_point = [pos[0], pos[1], pos[2]]
        this.temporaryPointColor = [r, g, b, a]
    }

    clearTemporaryHandle() {
        this.temporary_point = [];
        this.temporaryPointColor = [];
    }

    getHandlePos(idx) {
        let pos = vec4.create();
        let u = this.getU(idx);
        let v = this.getV(idx);
        vec4.set(pos, 
            this.control_points[u][3 * v + 0], 
            this.control_points[u][3 * v + 1], 
            this.control_points[u][3 * v + 2], 1.0);
        return pos;
    }

    getHandlePosFromUV(u, v) {
        let pos = vec4.create();
        vec4.set(pos, 
            this.control_points[u][3 * v + 0], 
            this.control_points[u][3 * v + 1],
            this.control_points[u][3 * v + 2], 1.0);
        return pos;
    }

    drawBSpline(projection, modelView, aspect, time) {
        let gl = BSpline.gl;
        if (!BSpline.BSplineShaderProgram) return;

        /* K is the knot interval containing x. It starts at degree, and ends at the last interval of the knot. */
        for (var ku = this.u_degree, kuu = 0; ku < this.u_knot_vector.length - (this.u_degree + 1); ++ku, ++kuu) 
        {
            for (var kv = this.v_degree, kvv = 0; kv < this.v_knot_vector.length - (this.v_degree + 1); ++kv, ++kvv) 
            {
                // t values
                {
                    const numComponents = 2;
                    const type = gl.FLOAT;
                    const normalize = false;
                    const stride = 0;
                    const offset = 0;
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0].uv);
                    gl.vertexAttribPointer(
                        BSpline.BSplineProgramInfo.attribLocations.uv,
                        numComponents,
                        type,
                        normalize,
                        stride,
                        offset);
                    gl.enableVertexAttribArray(
                        BSpline.BSplineProgramInfo.attribLocations.uv);
                }

                // direction
                {
                    const numComponents = 1;
                    const type = gl.FLOAT;
                    const normalize = false;
                    const stride = 0;
                    const offset = 0;
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0].tDirection);
                    gl.vertexAttribPointer(
                        BSpline.BSplineProgramInfo.attribLocations.direction,
                        numComponents,
                        type,
                        normalize,
                        stride,
                        offset);
                    gl.enableVertexAttribArray(
                        BSpline.BSplineProgramInfo.attribLocations.direction);
                }


                // Tell WebGL to use our program when drawing
                gl.useProgram(BSpline.BSplineProgramInfo.program);

                // Set the shader uniforms
                gl.uniformMatrix4fv(
                    BSpline.BSplineProgramInfo.uniformLocations.projection,
                    false,
                    projection);

                gl.uniformMatrix4fv(
                    BSpline.BSplineProgramInfo.uniformLocations.modelView,
                    false,
                    modelView);

                gl.uniform1f(
                    BSpline.BSplineProgramInfo.uniformLocations.thickness,
                    this.thickness);

                gl.uniform1f(
                    BSpline.BSplineProgramInfo.uniformLocations.aspect,
                    aspect);

                gl.uniform1i(
                    BSpline.BSplineProgramInfo.uniformLocations.miter,
                    0);

                gl.uniform1i(
                    BSpline.BSplineProgramInfo.uniformLocations.uKnotIndex,
                    ku); // I think this goes from degree to knot_vector_length

                gl.uniform1i(
                    BSpline.BSplineProgramInfo.uniformLocations.vKnotIndex,
                    kv); // I think this goes from degree to knot_vector_length

                gl.uniform1i(
                    BSpline.BSplineProgramInfo.uniformLocations.uDegree,
                    this.u_degree);

                gl.uniform1i(
                    BSpline.BSplineProgramInfo.uniformLocations.vDegree,
                    this.v_degree);

                gl.uniform1fv(
                    BSpline.BSplineProgramInfo.uniformLocations.uKnotVector,
                    new Float32Array(this.u_knot_vector)
                );

                gl.uniform1fv(
                    BSpline.BSplineProgramInfo.uniformLocations.vKnotVector,
                    new Float32Array(this.v_knot_vector)
                );

                gl.uniform1f(
                    BSpline.BSplineProgramInfo.uniformLocations.tminu,
                    this.u_knot_vector[ku]);

                gl.uniform1f(
                    BSpline.BSplineProgramInfo.uniformLocations.tmaxu,
                    this.u_knot_vector[ku + 1]);

                gl.uniform1f(
                    BSpline.BSplineProgramInfo.uniformLocations.tminv,
                    this.v_knot_vector[kv]);

                gl.uniform1f(
                    BSpline.BSplineProgramInfo.uniformLocations.tmaxv,
                    this.v_knot_vector[kv + 1]);

                /* Extract temporary control points */
                let tCtlPts = [];
                for (var ui = 0; ui < this.getUOrder(); ++ui) {
                    for (var vi = 0; vi < this.getVOrder(); ++vi) {
                        let p = this.getHandlePosFromUV(ui + kuu, vi + kvv);
                        tCtlPts.push(p[0], p[1], p[2])
                    }
                }

                gl.uniform3fv(
                    BSpline.BSplineProgramInfo.uniformLocations.controlPoints,
                    new Float32Array(tCtlPts));

                /* The temporary control point count is degree + 1 */
                gl.uniform1i(
                    BSpline.BSplineProgramInfo.uniformLocations.numUControlPoints,
                    this.getUOrder());

                gl.uniform1i(
                    BSpline.BSplineProgramInfo.uniformLocations.numVControlPoints,
                    this.getVOrder());

                {
                    const vertexCount = (this.num_samples * 2 * 6) * this.num_samples;
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
                }

            }
        }

    }

    drawControlPoints(projection, modelView, aspect, time) {
        let gl = BSpline.gl;

        if (!BSpline.LineShaderProgram) return;
        for (var s = 0; s < this.getNumUControlPoints(); ++s) {

            // position values
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsPosition);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.position,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.position);
            }

            // previous values
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsPrevious);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.previous,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.previous);
            }

            // next values
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsNext);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.next,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.next);
            }

            // direction
            {
                const numComponents = 1;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsDirection);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.direction,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.direction);
            }

            // color values
            {
                const numComponents = 4;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].handlePointsColors);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.color,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.color);
            }


            // Tell WebGL to use our program when drawing
            gl.useProgram(BSpline.LineProgramInfo.program);

            // Set the shader uniforms
            gl.uniformMatrix4fv(
                BSpline.LineProgramInfo.uniformLocations.projection,
                false,
                projection);

            gl.uniformMatrix4fv(
                BSpline.LineProgramInfo.uniformLocations.modelView,
                false,
                modelView);

            gl.uniform1f(
                BSpline.LineProgramInfo.uniformLocations.thickness,
                this.handle_thickness);

            gl.uniform1f(
                BSpline.LineProgramInfo.uniformLocations.aspect,
                aspect);

            gl.uniform1i(
                BSpline.LineProgramInfo.uniformLocations.miter,
                0);

            gl.uniform4fv(
                BSpline.LineProgramInfo.uniformLocations.color,
                this.selected ? this.selected_color : this.deselected_color);

            {
                const vertexCount = (this.handle_samples * 6) * ((this.control_points[s].length + this.temporary_point.length) / 3);
                const type = gl.UNSIGNED_SHORT;
                const offset = 0;
                // gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[s].handlePointsIndices);
                gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
            }
        }
    }

    drawControlPolygon(projection, modelView, aspect, time) {
        let gl = BSpline.gl;

        if (!BSpline.LineShaderProgram) return;

        /* All u curves (TEMPORARY) */
        for (var s = 0; s < this.getNumUControlPoints(); ++s) {
            // position values
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsPosition);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.position,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.position);
            }

            // previous values
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsPrevious);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.previous,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.previous);
            }

            // next values
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsNext);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.next,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.next);
            }

            // direction
            {
                const numComponents = 1;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsDirection);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.direction,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.direction);
            }

            // color values
            {
                const numComponents = 4;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[s].controlPointsColors);
                gl.vertexAttribPointer(
                    BSpline.LineProgramInfo.attribLocations.color,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    BSpline.LineProgramInfo.attribLocations.color);
            }


            // Tell WebGL to use our program when drawing
            gl.useProgram(BSpline.LineProgramInfo.program);

            // Set the shader uniforms
            gl.uniformMatrix4fv(
                BSpline.LineProgramInfo.uniformLocations.projection,
                false,
                projection);

            gl.uniformMatrix4fv(
                BSpline.LineProgramInfo.uniformLocations.modelView,
                false,
                modelView);

            gl.uniform1f(
                BSpline.LineProgramInfo.uniformLocations.thickness,
                this.handle_thickness * .5);

            gl.uniform1f(
                BSpline.LineProgramInfo.uniformLocations.aspect,
                aspect);

            gl.uniform1i(
                BSpline.LineProgramInfo.uniformLocations.miter,
                1);


            gl.uniform4fv(
                BSpline.LineProgramInfo.uniformLocations.color,
                this.selected ? [-0.4, -0.4, -0.4, 0] : [-0.7, -0.7, -0.7, 0.0]);

            {
                const vertexCount = (this.control_points[s].length / 3) * 2;
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
            }
        }

    }

    draw(projection, viewMatrix, aspect, time) {
        var gl = BSpline.gl;

        this.updateBuffers(projection, viewMatrix, aspect, time);
        if (this.show_control_polygon) {
            this.drawControlPolygon(projection, viewMatrix, aspect, time);
        }

        if (this.show_control_points) {
            this.drawControlPoints(projection, viewMatrix, aspect, time);
        }

        if (this.show_bspline) {
            this.drawBSpline(projection, viewMatrix, aspect, time);
        }
    }
}

export { BSpline }