precision mediump float;

uniform mat4 uPMatrix;
uniform sampler2D uSurfaceDepthData;

varying vec2 tex_coord;

void main(void) {
#line 0 10
    vec4 depthData = texture2D(uSurfaceDepthData, vec2(gl_FragCoord.x, gl_FragCoord.y));
    //gl_FragColor = vec4(1.0 - depthData.x, 1.0 -depthData.y, 1.0-depthData.z, 1.0);
    gl_FragColor = texture2D(uSurfaceDepthData, vec2(.5, .5));
    //gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);

}