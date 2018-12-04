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
        let bsfsSource = "";
        let bsvsSource = "";
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
            url: "./Shaders/BSplineSurface.vs",
            success: function (result) {
                bsvsSource = result.trim();
            }, error: function (result) {
                console.log("failed to load BSplineSurface.vs with error ");
                console.log(result);
            }
        }));
        promises.push($.ajax({
            url: "./Shaders/BSplineSurface.fs",
            success: function (result) {
                bsfsSource = result.trim();
            }, error: function (result) {
                console.log("failed to load BSplineSurface.fs with error ");
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
                    color: gl.getAttribLocation(BSpline.BSplineShaderProgram, 'color'),
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

            BSpline.SurfaceShaderProgram = BSpline.InitShaderProgram(gl, bsvsSource, bsfsSource);
            BSpline.SurfaceProgramInfo = {
                program: BSpline.SurfaceShaderProgram,
                attribLocations: {
                    uv: gl.getAttribLocation(BSpline.SurfaceShaderProgram, 'uv'),
                    direction: gl.getAttribLocation(BSpline.SurfaceShaderProgram, 'direction'),
                },
                uniformLocations: {
                    projection: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'projection'),
                    modelView: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'modelView'),
                    thickness: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'thickness'),
                    aspect: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'aspect'),
                    miter: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'miter'),
                    controlPoints: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'ControlPoints'),
                    numUControlPoints: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'uNumUControlPoints'),
                    numVControlPoints: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'uNumVControlPoints'),
                    uKnotVector: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'uKnotVector'),
                    vKnotVector: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'vKnotVector'),
                    uKnotIndex: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'uKnotIndex'),
                    vKnotIndex: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'vKnotIndex'),
                    uDegree: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'uDegree'),
                    vDegree: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'vDegree'),
                    tminu: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'tMinU'),
                    tmaxu: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'tMaxU'),
                    tminv: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'tMinV'),
                    tmaxv: gl.getUniformLocation(BSpline.SurfaceShaderProgram, 'tMaxV'),
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

    constructor(obj = null, dx = 0, dy = 0, dz = 0) {
        this.show_bspline = true;
        this.show_control_polygon = true;
        this.show_control_points = true;
        this.show_surface = true;
        this.show_mesh = true;
        this.show_knot_values = true;
        this.show_node_values = true;

        this.thickness = 5.0;
        this.control_points = (obj == null) ? [
            [-1.5 + dx, -1.5 + dy, dz, -.5 + dx, -1.5 + dy, dz, .5 + dx, -1.5 + dy, dz, 1.5 + dx, -1.5 + dy, dz,],
            [-1.5 + dx, -.5 + dy, dz, -.5 + dx, -.5 + dy, dz, .5 + dx, -.5 + dy, dz, 1.5 + dx, -.5 + dy, dz,],
            [-1.5 + dx, .5 + dy, dz, -.5 + dx, .5 + dy, dz, .5 + dx, .5 + dy, dz, 1.5 + dx, .5 + dy, dz,],
            [-1.5 + dx, 1.5 + dy, dz, -.5 + dx, 1.5 + dy, dz, .5 + dx, 1.5 + dy, dz, 1.5 + dx, 1.5 + dy, dz,],
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
        this.u_degree = (obj == null) ? 2 : obj.u_degree;
        this.v_degree = (obj == null) ? 2 : obj.v_degree;
        this.u_knot_vector = (obj == null) ? [0.0, .2, .4, .6, .8, 1.0, 1.5] : obj.u_knot_vector.slice();
        this.v_knot_vector = (obj == null) ? [0.0, .2, .4, .6, .8, 1.0, 1.5] : obj.v_knot_vector.slice();
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
    setUDegree(degree) {
        let oldDegree = this.u_degree;

        if ((degree >= 1) && (degree <= this.getNumUControlPoints() - 1))
            this.u_degree = degree;
        else return;

        // this.num_samples = 2 * this.u_degree + 20;
        if (this.u_knot_vector == undefined) {
            this.u_knot_vector = [];
        }

        let numKnots = this.getUOrder() + this.getNumUControlPoints();
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

    setVDegree(degree) {
        let oldDegree = this.v_degree;

        if ((degree >= 1) && (degree <= this.getNumVControlPoints() - 1))
            this.v_degree = degree;
        else return;

        // this.num_samples = 2 * this.v_degree + 20;
        if (this.v_knot_vector == undefined) {
            this.v_knot_vector = [];
        }

        let numKnots = this.getVOrder() + this.getNumVControlPoints();
        if (oldDegree < this.v_degree) {
            for (var i = numKnots - (this.v_degree - oldDegree); i < numKnots; ++i) {
                this.v_knot_vector.push(i / (numKnots - (1 + this.v_degree - oldDegree)));
            }
        } else {
            this.v_knot_vector = this.v_knot_vector.slice(0, numKnots);
        }

        for (var i = 0; i < numKnots; ++i) {
            this.v_knot_vector[i] /= this.v_knot_vector[this.v_knot_vector.length - 1];
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

    updateHandleBuffers(viewMatrix) {
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

        /* Create handle data */
        if (!this.handleBuffers) {
            this.handleBuffers = {};
            this.handleBuffers.Position = gl.createBuffer();
            this.handleBuffers.Next = gl.createBuffer();
            this.handleBuffers.Previous = gl.createBuffer();
            this.handleBuffers.Direction = gl.createBuffer();
            this.handleBuffers.Indices = gl.createBuffer();
            this.handleBuffers.Colors = gl.createBuffer();
        }

        let handlePoints = [];
        let handlePointsPrev = [];
        let handlePointsNext = [];
        let handlePointsDirection = [];
        let handlePointsIndices = [];
        let handlePointColors = [];
        let idxOffset = 0;
        for (var u_idx = 0; u_idx < this.getNumUControlPoints(); ++u_idx) {
            for (var v_idx = 0; v_idx < this.getNumVControlPoints(); ++v_idx) {
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
                    let handlePos = this.getHandlePosFromUV(u_idx, v_idx);

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
                    handlePointsDirection.push(-1, 1);

                    /* Colors */
                    // var rgb = hslToRgb(v_idx * (1.0 / this.getNumVControlPoints()), 1., .5);;
                    // handlePointColors.push(rgb[0], rgb[1], rgb[2], 1.0);
                    // handlePointColors.push(rgb[0], rgb[1], rgb[2], 1.0);
                    handlePointColors.push(1.0, 1.0, 1.0, 1.0);
                    handlePointColors.push(1.0, 1.0, 1.0, 1.0);


                    /* Indices */
                    if (j != this.handle_samples) {
                        let offset = (2 * (this.handle_samples + 1) * v_idx) + idxOffset; // 2 points per point. 6 floats per point. handle_samples + 1 points. 
                        // handlePointsIndices.push((handlePoints.length/3) -  j * 2 + (i * this.handle_samples + 1), j*2+1 + (i * this.handle_samples + 1));
                        /* each two points creates two triangles in our strip. */
                        handlePointsIndices.push(j * 2 + offset, j * 2 + 2 + offset, j * 2 + 1 + offset, j * 2 + 2 + offset, j * 2 + 3 + offset, j * 2 + 1 + offset); // first pt, second pt
                    }
                }
            }
            idxOffset = handlePointsIndices[handlePointsIndices.length - 1] + 3;
        }

        /* Upload handle data */
        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePoints), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Next);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointsNext), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Previous);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointsPrev), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Direction);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointsDirection), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.handleBuffers.Indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(handlePointsIndices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Colors);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(handlePointColors), gl.STATIC_DRAW)

        this.handleBuffers.num_indices = handlePointsIndices.length;
    }

    updateCageBuffers() {
        let gl = BSpline.gl;

        /* Create control polygon */
        if (!this.cageBuffers) {
            this.cageBuffers = {};
            this.cageBuffers.Position = gl.createBuffer();
            this.cageBuffers.Next = gl.createBuffer();
            this.cageBuffers.Previous = gl.createBuffer();
            this.cageBuffers.Direction = gl.createBuffer();
            this.cageBuffers.Indices = gl.createBuffer();
            this.cageBuffers.Colors = gl.createBuffer();
        }

        let ctlNext = [];
        let ctlPrev = [];
        let ctlPos = [];
        let ctlDirection = []
        let ctlColors = []
        let ctlIndices = []
        let ctlIdxOffset = 0;

        /* Fixed U idx */
        for (var u_idx = 0; u_idx < this.getNumUControlPoints(); ++u_idx) {
            for (var v_idx = 0; v_idx < this.getNumVControlPoints(); ++v_idx) {
                let vprev = Math.max(v_idx - 1, 0);
                let vnext = Math.min(v_idx + 1, this.getNumVControlPoints() - 1);

                let next_pos = this.getHandlePosFromUV(u_idx, vnext);
                let prev_pos = this.getHandlePosFromUV(u_idx, vprev);
                let curr_pos = this.getHandlePosFromUV(u_idx, v_idx);

                ctlNext.push(next_pos[0], next_pos[1], next_pos[2], next_pos[0], next_pos[1], next_pos[2]);
                ctlPrev.push(prev_pos[0], prev_pos[1], prev_pos[2], prev_pos[0], prev_pos[1], prev_pos[2]);
                ctlPos.push(curr_pos[0], curr_pos[1], curr_pos[2], curr_pos[0], curr_pos[1], curr_pos[2]);

                ctlColors.push(1.0, 1.0, 1.0, 1.0);
                ctlColors.push(1.0, 1.0, 1.0, 1.0);

                ctlDirection.push(-1, 1);

                if (v_idx != (this.getNumVControlPoints() - 1)) {
                    let offset = (2 * (this.getNumVControlPoints()) * u_idx) + ctlIdxOffset; // 2 points per point.  handle_samples + 1 points. 

                    /* each two points creates two triangles in our strip. */
                    ctlIndices.push(
                        v_idx * 2 + offset,
                        v_idx * 2 + 2 + offset,
                        v_idx * 2 + 1 + offset,
                        v_idx * 2 + 2 + offset,
                        v_idx * 2 + 3 + offset,
                        v_idx * 2 + 1 + offset); // first pt, second pt
                }
            }
        }

        ctlIdxOffset = (ctlPos.length / 3);

        /* Fixed V idx */
        for (var v_idx = 0; v_idx < this.getNumVControlPoints(); ++v_idx) {
            for (var u_idx = 0; u_idx < this.getNumUControlPoints(); ++u_idx) {
                let uPrev = Math.max(u_idx - 1, 0);
                let uNext = Math.min(u_idx + 1, this.getNumUControlPoints() - 1);

                let next_pos = this.getHandlePosFromUV(uNext, v_idx);
                let prev_pos = this.getHandlePosFromUV(uPrev, v_idx);
                let curr_pos = this.getHandlePosFromUV(u_idx, v_idx);

                ctlNext.push(next_pos[0], next_pos[1], next_pos[2], next_pos[0], next_pos[1], next_pos[2]);
                ctlPrev.push(prev_pos[0], prev_pos[1], prev_pos[2], prev_pos[0], prev_pos[1], prev_pos[2]);
                ctlPos.push(curr_pos[0], curr_pos[1], curr_pos[2], curr_pos[0], curr_pos[1], curr_pos[2]);

                ctlColors.push(1.0, 1.0, 1.0, 1.0);
                ctlColors.push(1.0, 1.0, 1.0, 1.0);

                ctlDirection.push(-1, 1);

                if (u_idx != (this.getNumUControlPoints() - 1)) {
                    let offset = (2 * (this.getNumUControlPoints()) * v_idx) + ctlIdxOffset; // 2 points per point. 6 floats per point. handle_samples + 1 points. 
                    // ctlIndices.push((handlePoints.length/3) -  u_idx * 2 + (i * this.handle_samples + 1), u_idx*2+1 + (i * this.handle_samples + 1));
                    /* each two points creates two triangles in our strip. */
                    ctlIndices.push(
                        u_idx * 2 + offset,
                        u_idx * 2 + 2 + offset,
                        u_idx * 2 + 1 + offset,
                        u_idx * 2 + 2 + offset,
                        u_idx * 2 + 3 + offset,
                        u_idx * 2 + 1 + offset); // first pt, second pt
                }
            }
        }

        /* Upload cage data */
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Previous);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctlPrev), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctlPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Next);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctlNext), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Direction);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctlDirection), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Colors);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctlColors), gl.STATIC_DRAW)

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cageBuffers.Indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ctlIndices), gl.STATIC_DRAW);

        this.cageBuffers.num_indices = ctlIndices.length;
    }

    updateCurveBuffers(ku, kv) {
        let gl = BSpline.gl;

        /* Create surface data */
        if (!this.curveBuffers) {
            this.curveBuffers = {};
            this.curveBuffers.uv = gl.createBuffer();
            this.curveBuffers.directions = gl.createBuffer();
            this.curveBuffers.colors = gl.createBuffer();
            this.curveBuffers.indices = gl.createBuffer();
        }

        /* Upload UV values */
        let uv = []
        let direction = [];
        let indices = [];
        let colors = [];
        let ctlIdxOffset = 0;

        let umin = this.u_knot_vector[ku]
        let umax = this.u_knot_vector[ku + 1]
        let vmin = this.v_knot_vector[kv]
        let vmax = this.v_knot_vector[kv + 1]
        if (this.show_node_values) {
            /* Compute node values */
            let uNodes = [];
            for (var i = 0; i <= this.u_knot_vector.length - this.u_degree; ++i) {
                let node = 0;
                for (var n = 1; n <= this.u_degree; ++n) {
                    node += this.u_knot_vector[i + n];
                }
                node /= this.u_degree;
                uNodes.push(node);
            }

            let vNodes = [];
            for (var i = 0; i <= this.v_knot_vector.length - this.v_degree; ++i) {
                let node = 0;
                for (var n = 1; n <= this.v_degree; ++n) {
                    node += this.v_knot_vector[i + n];
                }
                node /= this.v_degree;
                vNodes.push(node);
            }

            /* Add a curve for all uNodes in this patch */
            for (var i = 0; i < uNodes.length; ++i) {
                if ((uNodes[i] >= umin) && (uNodes[i] <= umax)) {
                    let u_val = (uNodes[i] - umin) / (umax - umin);

                    /* Node is within patch, add a curve. */
                    for (var s = 0; s <= this.num_samples; ++s) {
                        uv.push(u_val, s / this.num_samples);
                        uv.push(u_val, s / this.num_samples);
                        direction.push(-1, 1)

                        var rgb = hslToRgb(i * (1.0 / this.getNumUControlPoints()), 1., .5);;

                        colors.push(rgb[0], rgb[1], rgb[2], 1.0);
                        colors.push(rgb[0], rgb[1], rgb[2], 1.0);
                        if (s != this.num_samples) {
                            let offset = ctlIdxOffset; // 2 points per point.  handle_samples + 1 points. 

                            /* each two points creates two triangles in our strip. */
                            indices.push(
                                s * 2 + offset,
                                s * 2 + 2 + offset,
                                s * 2 + 1 + offset,
                                s * 2 + 2 + offset,
                                s * 2 + 3 + offset,
                                s * 2 + 1 + offset); // first pt, second pt
                        }
                    }

                    ctlIdxOffset = (uv.length / 2);
                }
            }

            /* Add a curve for all vNodes in this patch */
            for (var i = 0; i < vNodes.length; ++i) {
                if ((vNodes[i] >= vmin) && (vNodes[i] <= vmax)) {
                    let v_val = (vNodes[i] - vmin) / (vmax - vmin);

                    for (var s = 0; s <= this.num_samples; ++s) {
                        uv.push(s / this.num_samples, v_val);
                        uv.push(s / this.num_samples, v_val);
                        direction.push(-1, 1)

                        var rgb = hslToRgb(i * (1.0 / this.getNumVControlPoints()), 1., .5);;

                        colors.push(rgb[0], rgb[1], rgb[2], 1.0);
                        colors.push(rgb[0], rgb[1], rgb[2], 1.0);

                        if (s != this.num_samples) {
                            let offset = ctlIdxOffset; // 2 points per point. 6 floats per point. handle_samples + 1 points. 
                            // ctlIndices.push((handlePoints.length/3) -  s * 2 + (i * this.handle_samples + 1), s*2+1 + (i * this.handle_samples + 1));
                            /* each two points creates two triangles in our strip. */
                            indices.push(
                                s * 2 + offset,
                                s * 2 + 2 + offset,
                                s * 2 + 1 + offset,
                                s * 2 + 2 + offset,
                                s * 2 + 3 + offset,
                                s * 2 + 1 + offset); // first pt, second pt
                        }
                    }
                    ctlIdxOffset = (uv.length / 2);
                }
            }

        }


        let numU = 3;
        let numV = 3;

        if (this.show_mesh)
        {
            /* Lines with fixed U */
            for (var u_idx = 0; u_idx < numU; ++u_idx) {
                for (var s = 0; s <= this.num_samples; ++s) {
                    uv.push((u_idx + 1) / (numU + 1), s / this.num_samples);
                    uv.push((u_idx + 1) / (numU + 1), s / this.num_samples);
                    direction.push(-1, 1)
                    colors.push(0.5, .5, .5, 1.0);
                    colors.push(0.5, .5, .5, 1.0);
                    if (s != this.num_samples) {
                        let offset = (2 * (this.num_samples + 1) * u_idx) + ctlIdxOffset; // 2 points per point.  handle_samples + 1 points. 

                        /* each two points creates two triangles in our strip. */
                        indices.push(
                            s * 2 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 1 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 3 + offset,
                            s * 2 + 1 + offset); // first pt, second pt
                    }
                }
            }

            ctlIdxOffset = (uv.length / 2);

            /* Lines with fixed V */
            for (var v_idx = 0; v_idx < numV; ++v_idx) {
                for (var s = 0; s <= this.num_samples; ++s) {
                    uv.push(s / this.num_samples, (v_idx + 1) / (numV + 1));
                    uv.push(s / this.num_samples, (v_idx + 1) / (numV + 1));
                    direction.push(-1, 1)
                    colors.push(0.5, .5, .5, 1.0);
                    colors.push(0.5, .5, .5, 1.0);
                    if (s != this.num_samples) {
                        let offset = (2 * (this.num_samples + 1) * v_idx) + ctlIdxOffset; // 2 points per point. 6 floats per point. handle_samples + 1 points. 
                        // ctlIndices.push((handlePoints.length/3) -  s * 2 + (i * this.handle_samples + 1), s*2+1 + (i * this.handle_samples + 1));
                        /* each two points creates two triangles in our strip. */
                        indices.push(
                            s * 2 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 1 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 3 + offset,
                            s * 2 + 1 + offset); // first pt, second pt
                    }
                }
            }
        }


        ctlIdxOffset = (uv.length / 2);

        if (this.show_knot_values) {

            /* Knot Values */
            for (var u_idx = 0; u_idx <= 1; ++u_idx) {
                for (var s = 0; s <= this.num_samples; ++s) {
                    uv.push(u_idx, s / this.num_samples);
                    uv.push(u_idx, s / this.num_samples);
                    direction.push(-1, 1)
                    colors.push(1.0, 1.0, 1.0, 1.0);
                    colors.push(1.0, 1.0, 1.0, 1.0);
                    if (s != this.num_samples) {
                        let offset = (2 * (this.num_samples + 1) * u_idx) + ctlIdxOffset; // 2 points per point.  handle_samples + 1 points. 

                        /* each two points creates two triangles in our strip. */
                        indices.push(
                            s * 2 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 1 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 3 + offset,
                            s * 2 + 1 + offset); // first pt, second pt
                    }
                }
            }

            ctlIdxOffset = (uv.length / 2);

            for (var v_idx = 0; v_idx <= 1; ++v_idx) {
                for (var s = 0; s <= this.num_samples; ++s) {
                    uv.push(s / this.num_samples, v_idx);
                    uv.push(s / this.num_samples, v_idx);
                    direction.push(-1, 1)
                    colors.push(1.0, 1.0, 1.0, 1.0);
                    colors.push(1.0, 1.0, 1.0, 1.0);
                    if (s != this.num_samples) {
                        let offset = (2 * (this.num_samples + 1) * v_idx) + ctlIdxOffset; // 2 points per point. 6 floats per point. handle_samples + 1 points. 
                        // ctlIndices.push((handlePoints.length/3) -  s * 2 + (i * this.handle_samples + 1), s*2+1 + (i * this.handle_samples + 1));
                        /* each two points creates two triangles in our strip. */
                        indices.push(
                            s * 2 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 1 + offset,
                            s * 2 + 2 + offset,
                            s * 2 + 3 + offset,
                            s * 2 + 1 + offset); // first pt, second pt
                    }
                }
            }
        }
        ctlIdxOffset = (uv.length / 2);

        






        /* Upload Surface Data */
        gl.bindBuffer(gl.ARRAY_BUFFER, this.curveBuffers.uv);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.curveBuffers.directions);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(direction), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.curveBuffers.colors);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        this.curveBuffers.num_verticies = (uv.length / 2);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.curveBuffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.curveBuffers.num_indices = indices.length;
    }

    updateSurfaceBuffers() {
        let gl = BSpline.gl;

        /* Create surface data */
        if (!this.surfaceBuffers) {
            this.surfaceBuffers = {};
            this.surfaceBuffers.uv = gl.createBuffer();
        }

        /* Upload UV values */
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

        /* Upload Surface Data */
        gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceBuffers.uv);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);

        this.surfaceBuffers.num_verticies = 6 * this.num_samples * this.num_samples;
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
        return -1;
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
            let distance = vec3.dist(ray.pos, this.getHandlePosFromUV(0, this.getNumVControlPoints() - 1));
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
            let distance = vec3.dist(ray.pos, this.getHandlePosFromUV(this.getNumUControlPoints() - 1, 0));
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
        return -1;

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
        return -1;
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

    drawCurves(projection, modelView, aspect, time) {
        let gl = BSpline.gl;
        if (!BSpline.BSplineShaderProgram) return;

        /* K is the knot interval containing x. It starts at degree, and ends at the last interval of the knot. */
        for (var ku = this.u_degree, kuu = 0; ku < this.u_knot_vector.length - (this.u_degree + 1); ++ku, ++kuu) {
            for (var kv = this.v_degree, kvv = 0; kv < this.v_knot_vector.length - (this.v_degree + 1); ++kv, ++kvv) {

                this.updateCurveBuffers(ku, kv);


                // t values
                {
                    const numComponents = 2;
                    const type = gl.FLOAT;
                    const normalize = false;
                    const stride = 0;
                    const offset = 0;
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.curveBuffers.uv);
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
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.curveBuffers.directions);
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

                // colors
                {
                    const numComponents = 4;
                    const type = gl.FLOAT;
                    const normalize = false;
                    const stride = 0;
                    const offset = 0;
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.curveBuffers.colors);
                    gl.vertexAttribPointer(
                        BSpline.BSplineProgramInfo.attribLocations.color,
                        numComponents,
                        type,
                        normalize,
                        stride,
                        offset);
                    gl.enableVertexAttribArray(
                        BSpline.BSplineProgramInfo.attribLocations.color);
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
                    // const vertexCount = (this.num_samples * 2 * 6) * this.num_samples;
                    // gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.curveBuffers.num_verticies);
                    const type = gl.UNSIGNED_SHORT;
                    const offset = 0;
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.curveBuffers.indices);
                    gl.drawElements(gl.TRIANGLES, this.curveBuffers.num_indices, type, offset);
                }

            }
        }

    }

    drawSurface(projection, modelView, aspect, time) {
        this.updateSurfaceBuffers();

        let gl = BSpline.gl;
        if (!BSpline.SurfaceShaderProgram) return;

        /* K is the knot interval containing x. It starts at degree, and ends at the last interval of the knot. */
        for (var ku = this.u_degree, kuu = 0; ku < this.u_knot_vector.length - (this.u_degree + 1); ++ku, ++kuu) {
            for (var kv = this.v_degree, kvv = 0; kv < this.v_knot_vector.length - (this.v_degree + 1); ++kv, ++kvv) {
                // t values
                {
                    const numComponents = 2;
                    const type = gl.FLOAT;
                    const normalize = false;
                    const stride = 0;
                    const offset = 0;
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceBuffers.uv);
                    gl.vertexAttribPointer(
                        BSpline.SurfaceProgramInfo.attribLocations.uv,
                        numComponents,
                        type,
                        normalize,
                        stride,
                        offset);
                    gl.enableVertexAttribArray(
                        BSpline.SurfaceProgramInfo.attribLocations.uv);
                }

                // // direction
                // {
                //     const numComponents = 1;
                //     const type = gl.FLOAT;
                //     const normalize = false;
                //     const stride = 0;
                //     const offset = 0;
                //     gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0].tDirection);
                //     gl.vertexAttribPointer(
                //         BSpline.SurfaceProgramInfo.attribLocations.direction,
                //         numComponents,
                //         type,
                //         normalize,
                //         stride,
                //         offset);
                //     gl.enableVertexAttribArray(
                //         BSpline.SurfaceProgramInfo.attribLocations.direction);
                // }


                // Tell WebGL to use our program when drawing
                gl.useProgram(BSpline.SurfaceProgramInfo.program);

                // Set the shader uniforms
                gl.uniformMatrix4fv(
                    BSpline.SurfaceProgramInfo.uniformLocations.projection,
                    false,
                    projection);

                gl.uniformMatrix4fv(
                    BSpline.SurfaceProgramInfo.uniformLocations.modelView,
                    false,
                    modelView);

                gl.uniform1f(
                    BSpline.SurfaceProgramInfo.uniformLocations.thickness,
                    this.thickness);

                gl.uniform1f(
                    BSpline.SurfaceProgramInfo.uniformLocations.aspect,
                    aspect);

                gl.uniform1i(
                    BSpline.SurfaceProgramInfo.uniformLocations.miter,
                    0);

                gl.uniform1i(
                    BSpline.SurfaceProgramInfo.uniformLocations.uKnotIndex,
                    ku); // I think this goes from degree to knot_vector_length

                gl.uniform1i(
                    BSpline.SurfaceProgramInfo.uniformLocations.vKnotIndex,
                    kv); // I think this goes from degree to knot_vector_length

                gl.uniform1i(
                    BSpline.SurfaceProgramInfo.uniformLocations.uDegree,
                    this.u_degree);

                gl.uniform1i(
                    BSpline.SurfaceProgramInfo.uniformLocations.vDegree,
                    this.v_degree);

                gl.uniform1fv(
                    BSpline.SurfaceProgramInfo.uniformLocations.uKnotVector,
                    new Float32Array(this.u_knot_vector)
                );

                gl.uniform1fv(
                    BSpline.SurfaceProgramInfo.uniformLocations.vKnotVector,
                    new Float32Array(this.v_knot_vector)
                );

                gl.uniform1f(
                    BSpline.SurfaceProgramInfo.uniformLocations.tminu,
                    this.u_knot_vector[ku]);

                gl.uniform1f(
                    BSpline.SurfaceProgramInfo.uniformLocations.tmaxu,
                    this.u_knot_vector[ku + 1]);

                gl.uniform1f(
                    BSpline.SurfaceProgramInfo.uniformLocations.tminv,
                    this.v_knot_vector[kv]);

                gl.uniform1f(
                    BSpline.SurfaceProgramInfo.uniformLocations.tmaxv,
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
                    BSpline.SurfaceProgramInfo.uniformLocations.controlPoints,
                    new Float32Array(tCtlPts));

                /* The temporary control point count is degree + 1 */
                gl.uniform1i(
                    BSpline.SurfaceProgramInfo.uniformLocations.numUControlPoints,
                    this.getUOrder());

                gl.uniform1i(
                    BSpline.SurfaceProgramInfo.uniformLocations.numVControlPoints,
                    this.getVOrder());

                {
                    gl.drawArrays(gl.TRIANGLES, 0, this.surfaceBuffers.num_verticies);
                }

            }

        }

    }

    drawHandles(projection, modelView, aspect, time) {
        this.updateHandleBuffers(modelView);

        let gl = BSpline.gl;

        if (!BSpline.LineShaderProgram) return;

        // position values
        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Position);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Previous);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Next);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Direction);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffers.Colors);
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
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.handleBuffers.Indices);
            gl.drawElements(gl.TRIANGLES, this.handleBuffers.num_indices, type, offset);
        }
    }

    drawControlCage(projection, modelView, aspect, time) {
        this.updateCageBuffers();

        let gl = BSpline.gl;

        if (!BSpline.LineShaderProgram) return;

        // position values
        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Position);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Previous);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Next);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Direction);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cageBuffers.Colors);
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
            0);


        gl.uniform4fv(
            BSpline.LineProgramInfo.uniformLocations.color,
            this.selected ? [-0.4, -0.4, -0.4, 0] : [-0.7, -0.7, -0.7, 0.0]);

        {
            // const vertexCount = 8;//2 * (2 * this.getNumUControlPoints() * this.getNumVControlPoints());
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cageBuffers.Indices);
            gl.drawElements(gl.TRIANGLES, this.cageBuffers.num_indices, type, offset);
        }

    }

    draw(projection, viewMatrix, aspect, time) {
        var gl = BSpline.gl;

        gl.depthFunc(gl.LESS)

        //this.updateBuffers(projection, viewMatrix, aspect, time);
        if (this.show_bspline) {
            if (this.show_surface)
                this.drawSurface(projection, viewMatrix, aspect, time);
            // gl.depthFunc(gl.ALWAYS)
            this.drawCurves(projection, viewMatrix, aspect, time);
            // gl.depthFunc(gl.LESS)
        }

        if (this.show_control_polygon) {
            // gl.depthFunc(gl.ALWAYS)
            this.drawControlCage(projection, viewMatrix, aspect, time);
            // gl.depthFunc(gl.LESS)
        }

        if (this.show_control_points) {
            gl.depthFunc(gl.ALWAYS)
            this.drawHandles(projection, viewMatrix, aspect, time);
            gl.depthFunc(gl.LESS)
        }

    }
}

export { BSpline }