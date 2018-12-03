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
        d[j] = ControlPoints[v * uNumUControlPoints + j]; 
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
        d[j] = ControlPoints[j * uNumUControlPoints + u]; 
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
    float uPrev = max(uNow - .001, tMinU);
    float uNext = min(uNow + .001, tMaxU);

    float vNow = (uv[1] * (tMaxV - tMinV)) + tMinV;
    float vPrev = max(vNow - .001, tMinV);
    float vNext = min(vNow + .001, tMaxV);

    vec3 previous = deBoor(uKnotIndex, vKnotIndex, uPrev, vPrev, uDegree, vDegree);
    vec3 position = deBoor(uKnotIndex, vKnotIndex, uNow, vNow, uDegree, vDegree);
    vec3 next = deBoor(uKnotIndex, vKnotIndex, uNext, vNext, uDegree, vDegree);


    /* Line drawing code */
    vec2 aspectVec = vec2(aspect, 1.0);
    mat4 projViewModel = projection * modelView;
    vec4 previousProjected = projViewModel * vec4(previous, 1.0);
    vec4 currentProjected = projViewModel * vec4(position, 1.0);
    vec4 nextProjected = projViewModel * vec4(next, 1.0);

    //get 2D screen space with W divide and aspect correction
    vec2 currentScreen = currentProjected.xy / currentProjected.w * aspectVec;
    vec2 previousScreen = previousProjected.xy / previousProjected.w * aspectVec;
    vec2 nextScreen = nextProjected.xy / nextProjected.w * aspectVec;

    float len = thickness;
    float orientation = direction;

    //starting point uses (next - current)
    vec2 dir = vec2(0.0);
    if (position == previous) {
        dir = normalize(nextScreen - currentScreen);
    } 
    //ending point uses (current - previous)
    else if (position == next) {
        dir = normalize(currentScreen - previousScreen);
    }
    //somewhere in middle, needs a join
    else {
        //get directions from (C - B) and (B - A)
        vec2 dirA = normalize(currentScreen - previousScreen);
        if (miter == 1) {
        vec2 dirB = normalize(nextScreen - currentScreen);
        //now compute the miter join normal and length
        vec2 tangent = normalize(dirA + dirB);
        vec2 perp = vec2(-dirA.y, dirA.x);
        vec2 miter = vec2(-tangent.y, tangent.x);
        dir = tangent;
        len = min(thickness / dot(miter, perp), .05);
        } else {
        dir = dirA;
        }
    }
    vec2 normal = vec2(-dir.y, dir.x);
    normal *= len/2.0;
    normal.x /= aspect; // might need to multiply

    vec4 offset = vec4(normal * orientation, 0.0, 0.0);
    gl_Position = currentProjected + offset;
    gl_PointSize = 1.0;

    normal = normalize(normal);
    vColor = vec4(1.0, 1.0, 1.0, 1.0);//vec4(abs(normal.x), abs(normal.y), 0.0, 1.0);
    // vColor = vec4(1.0, 1.0, 1.0, 1.0);
    // vOffset = offset;
}