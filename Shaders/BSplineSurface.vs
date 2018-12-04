attribute vec2 uv;
attribute float direction; 

uniform mat4 modelView;
uniform mat4 projection;
uniform float aspect;

uniform float thickness;
uniform int miter;

uniform int uNumUControlPoints;
uniform int uNumVControlPoints;

uniform int uDegree; // uDegree of the curve
uniform int vDegree; // vDegree of the curve
uniform int uKnotIndex; // index of knot interval that contains x
uniform int vKnotIndex; // index of knot interval that contains x
uniform lowp vec3 ControlPoints[100];
uniform highp float uKnotVector[50];
uniform highp float vKnotVector[50];

uniform float tMinU;
uniform float tMaxU;
uniform float tMinV;
uniform float tMaxV;

varying lowp vec4 vColor;

/* For tensor product B-Spline evaluation */
vec3 deBoorU(int v, int k, float x, int p) {
    /* Upper limit is 10. */
    vec3 d[10];
    
    /* initialize d (control points extracted on host) */
    for (int j = 0; j <= 10; ++j) {
        if (p + 1 < j) break;
        d[j] = ControlPoints[j * uNumVControlPoints + v];//ControlPoints[j * uNumUControlPoints + v]; 
    }

    for (int r = 1; r <= 10; ++r) {
        if (p+1 < r) break;

        for (int j = 10; j >= 0; --j) {
            if (j > p) continue;
            if (j < r) break;

            if (j <= p) {
                float alpha = (x - uKnotVector[j+k-p]) / (uKnotVector[j+1+k-r] - uKnotVector[j+k-p]);
                d[j] = (1.0 - alpha) * d[j-1] + alpha * d[j];
            }
        }
    }

    /* Can't index with non-const */
    for (int i = 0; i < 10; ++i) {
        if (i == p) {
            return d[i];
        }
    }
    return vec3(0.0, 0.0, 0.0);
}

vec3 deBoorV(int u, int k, float x, int p) {
    /* Upper limit is 10. */
    vec3 d[10];
    
    /* initialize d (control points extracted on host) */
    for (int j = 0; j <= 10; ++j) {
        if (p + 1 < j) break;
        d[j] = ControlPoints[u * uNumVControlPoints + j]; 
    }

    for (int r = 1; r <= 10; ++r) {
        if (p+1 < r) break;

        for (int j = 10; j >= 0; --j) {
            if (j > p) continue;
            if (j < r) break;

            if (j <= p) {
                float alpha = (x - vKnotVector[j+k-p]) / (vKnotVector[j+1+k-r] - vKnotVector[j+k-p]);
                d[j] = (1.0 - alpha) * d[j-1] + alpha * d[j];
            }
        }
    }

    /* Can't index with non-const */
    for (int i = 0; i < 10; ++i) {
        if (i == p) {
            return d[i];
        }
    }
    return vec3(0.0, 0.0, 0.0);
}

/*
    k: index of knot interval that contains x
    x: the position
    uKnotVector: array of knot positions, needs to be padded as described above
    ControlPoints: array of control points
    p: uDegree of B-spline
*/
vec3 deBoor(int ku, int kv, float u, float v, int uDeg, int vDeg) {
    /* Upper limit is 10. */
    vec3 d[10];
    
    /* initialize d (control points extracted on host) */
    for (int j = 0; j <= 10; ++j) {
        if (uDeg + 1 < j) break;
        d[j] = deBoorV(j, kv, v, vDeg);// ControlPoints[j]; 
    }

    for (int r = 1; r <= 10; ++r) {
        if (uDeg+1 < r) break;

        for (int j = 10; j >= 0; --j) {
            if (j > uDeg) continue;
            if (j < r) break;

            if (j <= uDeg) {
                float alpha = (u - uKnotVector[j+ku-uDeg]) / (uKnotVector[j+1+ku-r] - uKnotVector[j+ku-uDeg]);
                d[j] = (1.0 - alpha) * d[j-1] + alpha * d[j];
            }
        }
    }

    /* Can't index with non-const */
    for (int i = 0; i < 10; ++i) {
        if (i == uDeg) {
            return d[i];
        }
    }
    return vec3(0.0, 0.0, 0.0);
}

void main(void) {
    float uNow = (uv[0] * (tMaxU - tMinU)) + tMinU;
    float vNow = (uv[1] * (tMaxV - tMinV)) + tMinV;

    vec3 position = deBoor(uKnotIndex, vKnotIndex, uNow, vNow, uDegree, vDegree);

    /* Line drawing code */
    mat4 projViewModel = projection * modelView;
    vec4 currentProjected = projViewModel * vec4(position, 1.0);

    gl_Position = currentProjected;
    vColor = vec4(1.0, 1.0, 1.0, 1.0);
}