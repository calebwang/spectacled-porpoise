precision highp float;

uniform sampler2D uSurfaceDepthData;
uniform vec2 uViewportSize;

void main(void) {
#line 0 10
    vec2 tex_coord = gl_FragCoord.xy/uViewportSize;
    float depth = texture2D(uSurfaceDepthData, tex_coord).x;

    float sum = 0.0;
    float wsum = 0.0;
    float filterRadius = 20.0;
    float blurScale = .5;
    float blurDepthFalloff = .9;
    vec2 blurDir = vec2(1.0/uViewportSize.x, 0.0);

    for(float x = -50.0; x <= 50.0; x+=1.0) {
        float sample = texture2D(uSurfaceDepthData, tex_coord + x*blurDir).x;
        float r = x * blurScale;
        float w = exp(-r*r);

        float r2 = (sample - depth) * blurDepthFalloff;
        float g = exp(-r2*r2);

        sum += sample * w * g; 
        wsum += w*g;
    }

    if (wsum > 0.0) {
        sum =  sum/wsum;
    }

    gl_FragColor = vec4(sum, sum, sum, 1.0);
}