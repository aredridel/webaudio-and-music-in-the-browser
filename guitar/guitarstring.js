import { AsmFunctionsWrapper } from './guitarstring_asm.js';
export { GuitarString };

class GuitarString {
    constructor(audioCtx, audioDestination, stringN, octave, semitone) {
        this.audioCtx = audioCtx;
        this.audioDestination = audioDestination;

        // work from A0 as a reference,
        // since it has a nice round frequency
        const a0_hz = 27.5;
        // an increase in octave by 1 doubles the frequency
        // each octave is divided into 12 semitones
        // the scale goes C0, C0#, D0, D0#, E0, F0, F0#, G0, G0#, A0, A0#, B0
        // so go back 9 semitones to get to C0
        const c0_hz = a0_hz * Math.pow(2, -9/12);
        this.basicHz = c0_hz * Math.pow(2, octave+semitone/12);
        this.basicHz = this.basicHz.toFixed(2);

        const basicPeriod = 1/this.basicHz;
        const basicPeriodSamples = Math.round(basicPeriod * audioCtx.sampleRate);
        this.seedNoise = generateSeedNoise(65535, basicPeriodSamples);

        // this is only used in a magical calculation of filter coefficients
        this.semitoneIndex = octave*12 + semitone - 9;

        // ranges from -1 for first string to +1 for last
        this.acousticLocation = (stringN - 2.5) * 0.4;

        this.mode = "karplus-strong";

        this.asmWrapper = new AsmFunctionsWrapper();

        function generateSeedNoise(seed, samples) {
            const noiseArray = new Float32Array(samples);
            for (var i = 0; i < samples; i++) {
                noiseArray[i] = -1 + 2*Math.random();
            }
            return noiseArray;
        }
    }


    pluck(startTime, velocity, tab) {
        // create the buffer we're going to write into
        const channels = 2;
        const sampleRate = this.audioCtx.sampleRate;
        // 1 second buffer
        const sampleCount = 1.0 * sampleRate;
        const buffer = this.audioCtx.createBuffer(channels, sampleCount, sampleRate);

        const options = getControlsValues();
        const smoothingFactor = calculateSmoothingFactor(this, tab, options);
        // 'tab' represents which fret is held while plucking
        // each fret represents an increase in pitch by one semitone
        // (logarithmically, one-twelth of an octave)
        const hz = this.basicHz * Math.pow(2, tab/12);

        // to match original ActionScript source
        velocity /= 4;

        // TODO: make this a proper enum or something
        if (this.mode == "karplus-strong") {
            this.asmWrapper.pluck(
                    buffer,
                    this.seedNoise,
                    sampleRate,
                    hz,
                    smoothingFactor,
                    velocity,
                    options,
                    this.acousticLocation
            );
        } else if (this.mode == "sine") {
            const decayFactor = 8;
            this.asmWrapper.pluckDecayedSine(
                    buffer,
                    sampleRate,
                    hz,
                    velocity,
                    decayFactor
            );
        }

        // create an audio source node fed from the buffer we've just written
        const bufferSource = this.audioCtx.createBufferSource();
        bufferSource.buffer = buffer;
        bufferSource.connect(this.audioDestination);

        bufferSource.start(startTime);
    }
}
//
// calculate the constant used for the low-pass filter
// used in the Karplus-Strong loop
function calculateSmoothingFactor(string, tab, options) {
    var smoothingFactor;
    if (options.stringDampingCalculation == "direct") {
        smoothingFactor = options.stringDamping;
    } else if (options.stringDampingCalculation == "magic") {
        // this is copied verbatim from the flash one
        // is magical, don't know how it works
        var noteNumber = (string.semitoneIndex + tab - 19)/44;
        smoothingFactor =
            options.stringDamping +
            Math.pow(noteNumber, 0.5) * (1 - options.stringDamping) * 0.5 +
            (1 - options.stringDamping) *
                Math.random() *
                options.stringDampingVariation;
    }
    return smoothingFactor;
}


function getControlsValues() {
    /* FIXME: make these settable from the outside */

    return {
        characterVariation: 0.5,
        stringDamping: 0.5,
        stringDampingVariation: 0.25,
        pluckDamping: 0.5,
        pluckDampingVariation: 0.25,
        stringTension: 0.2,
        stringDampingCalculation: 'magic',
        stereoSpread: 0.2,
        body: 'simple',
    }
}
