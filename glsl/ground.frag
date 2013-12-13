precision mediump float;
precision mediump int;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec2 vPos;

void main(void) {
    vec3 ptLightLoc = vec3(0.0, 0.0, 0.5);
    vec3 kd = vec3(1.0);
    vec3 l = normalize(ptLightLoc - vec3(vPos, 0.0));
    vec3 n = vec3(0.0, 0.0, 1.0);

    //hacky lighting solution
    vec3 light = max(dot(n, l), 0.0) * kd;
    vec3 color = light + .01; // 2 lights + some ambient

    gl_FragColor = vec4(color, 1.0);
}