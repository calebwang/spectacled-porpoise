precision mediump float;
precision mediump int;

attribute vec2 aVertexCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec2 vPos;

void main(void) {
    vPos = aVertexCoord;
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexCoord.x, 0.0, aVertexCoord.y, 1.0);;
}