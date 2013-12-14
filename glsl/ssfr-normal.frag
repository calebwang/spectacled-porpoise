precision highp float;

uniform mat4 uPMatrix;
uniform mat4 uInvPMatrix;
uniform mat4 uInvMVMatrix;
uniform sampler2D uSurfaceDepthData;
uniform vec2 uViewportSize;

vec3 uvToEye(vec2 uv, float depth) {
    vec3 eye = vec4(uInvMVMatrix * uInvPMatrix * vec4(uv, 0.0, 1.0)).xyz;
    eye.z = depth * 2.0;
    return eye;
}

vec3 getEyePos(vec2 uv) {
    vec3 eye = vec4(uInvMVMatrix * uInvPMatrix * vec4(uv, 0.0, 1.0)).xyz;
    float depthData = texture2D(uSurfaceDepthData, uv).z;
    eye.z = depthData * 2.0;
    return eye;
}

void main(void) {
#line 0 10
    //hacky lighting solution
    vec3 lightDir1 = vec3(1.0, -1.0 , 1.0);
    vec3 kd1 = vec3(0.0, .3, .5);
    vec3 ks1 = vec3(.5, .5, .5);
    vec3 lightDir2 = vec3(-1.0, -1.0, 0.0);
    vec3 kd2 = vec3(.3, 0.0, .5);
    vec3 ks2 = vec3(.0, .0, .0);

    vec2 tex_coord = gl_FragCoord.xy/uViewportSize;
    float depthData = texture2D(uSurfaceDepthData, tex_coord).x;

    if(depthData <= 0.0) discard;
    vec3 posEye = uvToEye(tex_coord, depthData);

    vec3 ddx = getEyePos(tex_coord + vec2(1.0/uViewportSize.x, 0.0)) - posEye;
    vec3 ddx2 = posEye - getEyePos(tex_coord + vec2(-1.0/uViewportSize.x, 0.0));
    if(abs(ddx.z) > abs(ddx2.z)) {
        ddx = ddx2;
    }

    vec3 ddy = getEyePos(tex_coord + vec2(0.0, 1.0/uViewportSize.y)) - posEye;
    vec3 ddy2 = posEye - getEyePos(tex_coord + vec2(0.0, -1.0/uViewportSize.y));
    if(abs(ddy2.z) < abs(ddy.z)) {
        ddy = ddy2;
    }

    vec3 n = cross(ddx, ddy);
    vec3 norm = normalize(n);
    //vec3 norm = vec3(abs(n.x), abs(n.y), abs(n.z));


    //hacky lighting solution
    vec3 viewDir = normalize(-posEye);
    vec3 reflectDir1 = reflect(-lightDir1, norm);
    float specAngle1 = max(dot(reflectDir1, viewDir), 0.0);
    vec3 specular1 = pow(specAngle1, 15.0) * ks1;

    vec3 reflectDir2 = reflect(-lightDir2, norm);
    float specAngle2 = max(dot(reflectDir2, viewDir), 0.0);
    vec3 specular2 = pow(specAngle2, 15.0) * ks2;

    vec3 light1 = max(dot(norm, lightDir1), 0.0) * kd1 + specular1;
    vec3 light2 = max(dot(norm, lightDir2), 0.0) * kd2 + specular2;
    vec3 color = light1 + light2 + .01; // 2 lights + some ambient
    gl_FragColor = vec4(min(color.r, 1.0), min(color.g, 1.0), min(color.b, 1.0), 1.0);

    //gl_FragColor = vec4(norm, 1.0);
    //gl_FragColor = texture2D(uSurfaceDepthData, tex_coord);
}