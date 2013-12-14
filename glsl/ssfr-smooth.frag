precision highp float;

uniform sampler2D uSurfaceDepthData;
uniform vec2 uViewportSize;

void main(void) {
#line 0 10
    vec2 tex_coord = gl_FragCoord.xy/uViewportSize;
    float depth = texture2D(uSurfaceDepthData, tex_coord).x;

    float sumx = 0.0;
    float wsumx = 0.0;
    float sumy = 0.0;
    float wsumy = 0.0;
    float filterRadius = 20.0;
    float blurScale = .33;
    float blurDepthFalloff = .33;
    vec2 blurDirx = vec2(1.0/uViewportSize.x, 0.0);
    vec2 blurDiry = vec2(0.0, 1.0/uViewportSize.y);

    for(float x = -20.0; x <= 20.0; x+=1.0) {
        float sample = texture2D(uSurfaceDepthData, tex_coord + x*blurDirx).x;
        float r = x * blurScale;
        float w = exp(-r*r);

        float r2 = (sample - depth) * blurDepthFalloff;
        float g = exp(-r2*r2);

        sumx += sample * w * g; 
        wsumx += w*g;
    }
    if (wsumx > 0.0) {
        sumx =  sumx/wsumx;
    }

    for(float y = -20.0; y <= 20.0; y+=1.0) {
        float sample = texture2D(uSurfaceDepthData, tex_coord + y*blurDiry).x;
        float r = y * blurScale;
        float w = exp(-r*r);

        float r2 = (sample - depth) * blurDepthFalloff;
        float g = exp(-r2*r2);

        sumy += sample * w * g; 
        wsumy += w*g;
    }
    if (wsumy > 0.0) {
        sumy =  sumy/wsumy;
    }

    float sum = (sumx + sumy)/2.0;
    gl_FragColor = vec4(sum, sum, sum, 1.0);
}