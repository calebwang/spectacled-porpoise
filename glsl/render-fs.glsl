  #line 0 1
  precision mediump float;

  uniform sampler2D uParticlePositionData;
  uniform float uGridSize;

  varying float vCoord;

  vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * mod(particleNumber, uGridSize);
    uv.y = interval * floor(particleNumber/uGridSize);
    return uv;
  }

  void main(void) {
    gl_FragColor = texture2D(uParticlePositionData, getUVFromIndex(vCoord));
  }

