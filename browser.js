function webaudio (context, fn) {
	
    if (typeof context === 'function') {
      var Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('AudioContext not supported');
      fn = context;
      context = new Context();
    }

    var self = context.createScriptProcessor(2048, 1, 1);

	  self.fn = fn;
	
	  self.i = self.t = 0;
	
  	window._SAMPLERATE = self.sampleRate = self.rate = context.sampleRate;

		self.duration = Infinity;
		
		self.recording = false;

	  self.onaudioprocess = function(e){
	    var output = e.outputBuffer.getChannelData(0)
			,   input = e.inputBuffer.getChannelData(0);
			self.tick(output, input);
	  };
	
		self.tick = function (output, input) { // a fill-a-buffer function

		    output = output || self._buffer;
		
		    input = input || [];

		    for (var i = 0; i < output.length; i += 1) {

		        self.t = self.i / self.rate;
		
		        self.i += 1;

						output[i] = self.fn(self.t, self.i, input[i]);
						
		        if(self.i >= self.duration) {
			    		self.stop();
			    		break;
		        }

		    }

		    return output
		};
		
		self.stop = function(){
			self.disconnect();
			
		  self.playing = false;
		
		  if(self.recording) ;
		};

		self.play = function(opts){

		  if (self.playing) return;

      self.context.resume();

		  self.connect(self.context.destination);
		
		  self.playing = true;

		// this timeout seems to be the thing that keeps the audio from clipping #WTFALEART

		  setTimeout(function(){this.node.disconnect();}, 100000000000);

		  return
		};

		self.record = function(){

		};
		
		self.reset = function(){
			self.i = self.t = 0;
		};
		
		self.createSample = function(duration){
			self.reset();
	    var buffer = self.context.createBuffer(1, duration, self.context.sampleRate);
			var blob = buffer.getChannelData(0);
	    self.tick(blob);
			return buffer
		};

    return self;
}

export { webaudio };
