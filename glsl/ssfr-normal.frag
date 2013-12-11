precision mediump float;

uniform mat4 uPMatrix;
uniform sampler2D uSurfaceDepthData;
uniform vec2 uViewportSize;

varying vec2 tex_coord;

void main(void) {
#line 0 10
    vec4 depthData = texture2D(uSurfaceDepthData, vec2(gl_FragCoord.x, gl_FragCoord.y));
    //gl_FragColor = vec4(1.0 - depthData.x, 1.0 -depthData.y, 1.0-depthData.z, 1.0);
    gl_FragColor = texture2D(uSurfaceDepthData, tex_coord/uViewportSize);
    //gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
}