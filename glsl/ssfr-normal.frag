precision mediump float;

uniform sampler2D uSurfaceDepthData;
uniform mat4 uPMatrix;

void main(void) {
#line 0 10
    gl_FragColor = texture2D(uSurfaceDepthData, vec2(gl_FragCoord.x, gl_FragCoord.y));
}