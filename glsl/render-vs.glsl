  #line 0 2
  precision mediump float;
  precision mediump int;

  attribute float aParticleIndex;

  uniform float uGridSize;

  uniform sampler2D uParticlePositionData;
  uniform mat4 uMVMatrix;
  uniform mat4 uPMatrix;

  varying float vCoord;

  vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * mod(particleNumber, uGridSize);
    uv.y = interval * floor(particleNumber/uGridSize);
    return uv;
  }


  void main(void) {
  #line 10 100
    vec2 uv = getUVFromIndex(aParticleIndex);
    vec4 particle = texture2D(uParticlePositionData, uv);
    vCoord = aParticleIndex;
    gl_Position = uPMatrix * uMVMatrix * particle;
    gl_PointSize = 2.0;
  }
