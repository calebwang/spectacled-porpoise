precision mediump float;
precision mediump int;

uniform sampler2D uTextureData;
varying vec2 vTexCoord;

void main(void) {
    gl_FragColor = texture2D(uTextureData, vTexCoord);
}
