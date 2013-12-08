precision mediump float;

// the texCoords passed in from the vertex shader.
varying vec4 vColor;

void main() {
    // Write the color passed from the vertex shader
    gl_FragColor = vColor;
}
