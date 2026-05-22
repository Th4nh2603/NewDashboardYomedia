(function (cjs, an) {

var p; // shortcut to reference prototypes
var lib={};var ss={};var img={};
lib.ssMetadata = [];


(lib.AnMovieClip = function(){
	this.actionFrames = [];
	this.ignorePause = false;
	this.gotoAndPlay = function(positionOrLabel){
		cjs.MovieClip.prototype.gotoAndPlay.call(this,positionOrLabel);
	}
	this.play = function(){
		cjs.MovieClip.prototype.play.call(this);
	}
	this.gotoAndStop = function(positionOrLabel){
		cjs.MovieClip.prototype.gotoAndStop.call(this,positionOrLabel);
	}
	this.stop = function(){
		cjs.MovieClip.prototype.stop.call(this);
	}
}).prototype = p = new cjs.MovieClip();
// symbols:



(lib._1001 = function() {
	this.initialize(img._1001);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,468,341);


(lib.BBMATONG = function() {
	this.initialize(img.BBMATONG);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,198,305);


(lib.bg2 = function() {
	this.initialize(img.bg2);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,768,1366);


(lib.bgpngcopy1 = function() {
	this.initialize(img.bgpngcopy1);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,768,488);


(lib.card1 = function() {
	this.initialize(img.card1);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,1200,578);


(lib.CTA = function() {
	this.initialize(img.CTA);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,210,57);


(lib.cumsp = function() {
	this.initialize(img.cumsp);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,843,665);


(lib.fss = function() {
	this.initialize(img.fss);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,619,88);


(lib.HQM = function() {
	this.initialize(img.HQM);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,255,296);


(lib.lanhuongpngcopy = function() {
	this.initialize(img.lanhuongpngcopy);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,455,407);


(lib.lightcuaso = function() {
	this.initialize(img.lightcuaso);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,452,440);


(lib.LOGO = function() {
	this.initialize(img.LOGO);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,470,321);


(lib.Tagline = function() {
	this.initialize(img.Tagline);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,921,236);


(lib.TL = function() {
	this.initialize(img.TL);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,636,498);// helper functions:

function mc_symbol_clone() {
	var clone = this._cloneProps(new this.constructor(this.mode, this.startPosition, this.loop, this.reversed));
	clone.gotoAndStop(this.currentFrame);
	clone.paused = this.paused;
	clone.framerate = this.framerate;
	return clone;
}

function getMCSymbolPrototype(symbol, nominalBounds, frameBounds) {
	var prototype = cjs.extend(symbol, cjs.MovieClip);
	prototype.clone = mc_symbol_clone;
	prototype.nominalBounds = nominalBounds;
	prototype.frameBounds = frameBounds;
	return prototype;
	}


(lib.uptofsize = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_3
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#666666").ss(2.5,1,1).p("Ag8gEIA9g1IA8A1Ag8A6IA9g0IA8A0");
	this.shape.setTransform(1.5,-1.1);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	// Layer_2
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#FFFFFF").ss(1,1,1).p("Ah8AAQAAgyAlglQAkglAzAAQA1AAAkAlQAkAlAAAyQAAA0gkAlQgkAkg1AAQgzAAgkgkQglglAAg0g");
	this.shape_1.setTransform(1.5,-0.8);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("rgba(255,255,255,0.6)").s().p("AhXBYQglgkAAg0QAAgzAlgkQAlglAyAAQA1AAAjAlQAlAkAAAzQAAA0glAkQgjAlg1AAQgyAAglglg");
	this.shape_2.setTransform(1.5,-0.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1}]}).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.uptofsize, new cjs.Rectangle(-12,-14.3,27,27), null);


(lib.Tween20 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["rgba(255,255,255,0)","rgba(255,255,255,0.749)","rgba(255,255,255,0)"],[0,0.51,1],-16.7,0,16.8,0).s().p("AimFTIAAqlIFNAAIAAKlg");
	this.shape.setTransform(-0.025,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-16.7,-33.8,33.4,67.69999999999999);


(lib.Tween18 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.lanhuongpngcopy();
	this.instance.setTransform(-98.6,-88.2,0.4335,0.4335);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-98.6,-88.2,197.3,176.5);


(lib.Symbol57 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_2_copy
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#E43157").s().p("AIdAoIAAgjIgWAdIgCAAIgWgdIAAAjIgMAAIAAgyIAOAAIAWAdIAWgdIAMAAIAAAygAGmAoIAAgyIA1AAIAAALIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAGRAoIAAgUIglAAIAAAUIgMAAIAAgyIAMAAIAAATIAlAAIAAgTIAMAAIAAAygAE5AoIAAgnIgYAAIAAgLIA7AAIAAALIgXAAIAAAngAEAAoIAAgjIgWAdIgDAAIgWgdIAAAjIgMAAIAAgyIAOAAIAXAdIAWgdIALAAIAAAygACJAoIAAgyIA0AAIAAALIgoAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAB3AoIgSgSIgTASIgOAAIAagaIgYgYIAPAAIARARIASgRIANAAIgYAYIAZAagAgBAoIAAgyIA0AAIAAALIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAgfAoIgnAAIAAgVIgHAAIAAgJIAHAAIAAgUIAnAAIAEAAIAEACIADAAIADACQAEACACAEQABADAAAJIAAAHIAAAHIgCAFQgCAEgDADIgDABIgDABIgEAAIgEAAgAg7AdIAcAAQAFAAACgCQADgDAAgEIAAgJQAAgGgDgCQgCgCgFAAIgcAAIAAAJIAWAAIAAAJIgWAAgAhrAoIgpgjIAAAjIgMAAIAAgyIAJAAIApAiIAAgiIAMAAIAAAygAjdAoIAAgyIA1AAIAAALIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAkTAoIAAgyIAMAAIAAAnIAmAAIAAALgAlMAoIAAgnIgYAAIAAgLIA7AAIAAALIgXAAIAAAngAmYAoIgGAAQAAAAgBAAQAAAAgBgBQAAAAgBAAQAAgBAAAAIgCgEIgBgFIAAgcQAAgGADgCQACgDAHAAIAmAAIAFACIADABQABAAAAABQAAAAAAAAQABABAAAAQAAABAAAAIABAFIAAAcIgBAFIgCAEIgDACIgFAAgAmYAdIAlAAIAAgcIglAAgAnaAoIgGAAIgDgCIgCgEIgBgFIAAgnIAMAAIAAAnIAiAAIAAgnIAMAAIAAAnIgBAFIgCAEQAAAAAAABQgBAAAAAAQgBABAAAAQgBAAAAAAIgFAAgAoKAoIgegyIAOAAIAUAkIAUgkIAMAAIgcAygAHIgQIgHgHIgIAHIgGAAIAKgNIAIAAIAKANgAAggQIgHgHIgIAHIgGAAIAKgNIAIAAIAKANgAi7gQIgHgHIgIAHIgGAAIAKgNIAIAAIAKANgAl+gQIgHgHIgIAHIgHAAIAKgNIAJAAIAKANgAAjgXIAAgCIAAgBIABgCIABgBIAGgDIAAgBIgKAAIAAABIgFgBIAAgBIABgEQAAAAABgBQAAAAAAAAQABAAABAAQAAgBABAAIAKAAIADABIACABIABABIAAADIAAACIAAABIAAABIgBAAIgBABIgGAEIAAABIAAABgAmWgZIAKgNIALAAIgOANg");
	this.shape.setTransform(56.275,5.05);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	// Layer_2
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#FFFFFF").ss(2,1,1).p("AIpgJIAAAyIgMAAIAAgkIgWAdIgCAAIgWgdIAAAkIgMAAIAAgyIAOAAIAWAcIAWgcgAG5gQIgGAAIAKgMIAIAAIAKAMIgHAAIgHgHgAGmgJIA1AAIAAAKIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAAMIg1AAgAFggJIAMAAIAAASIAlAAIAAgSIAMAAIAAAyIgMAAIAAgVIglAAIAAAVIgMAAgAFFApIgMAAIAAgoIgYAAIAAgKIA7AAIAAAKIgXAAgAELgJIAAAyIgLAAIAAgkIgWAdIgDAAIgWgdIAAAkIgMAAIAAgyIAOAAIAXAcIAWgcgACJgJIA0AAIAAAKIgoAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAAMIg1AAgABeAPIgYgYIAPAAIARAQIASgQIANAAIgYAXIAZAbIgPAAIgSgTIgTATIgOAAgAAhggIgFgBIAAgBQAAgDABgBQABgCADAAIAKAAQACAAABABQABAAABABQABABAAAAQAAABAAACIAAACQAAAAAAABQAAAAAAABIgBAAQAAABgBABIgGACQAAABAAABIAAABIgGAAIAAgDQAAAAAAgBIABAAQAAgBABAAIAGgFIAAgBIgKAAgAgBgJIA0AAIAAAKIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAAMIg0AAgAARgQIgGAAIAKgMIAIAAIAKAMIgHAAIgHgHgAg7ATIAAAKIAcAAQAFAAACgCQADgCAAgFIAAgKQAAgFgDgCQgCgCgFAAIgcAAIAAAJIAWAAIAAAJgAhGAKIAAgTIAnAAQACAAACAAQACAAACAAQACAAABABQABABACAAQAEADACAEQABAEAAAIIAAAHQAAAEAAADQgBADgBACQgCAEgDADQgCABgBAAQgBABgCAAQgCAAgCABQgCAAgCAAIgnAAIAAgWIgHAAIAAgJgAiggJIAJAAIApAhIAAghIAMAAIAAAyIgJAAIgpgkIAAAkIgMAAgAjdgJIA1AAIAAAKIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAAMIg1AAgAjKgQIgGAAIAKgMIAIAAIAKAMIgHAAIgHgHgAkTgJIAMAAIAAAmIAmAAIAAAMIgyAAgAlAApIgMAAIAAgoIgYAAIAAgKIA7AAIAAAKIgXAAgAlnAdQAAAEgBACQAAABgCACQgBACgCAAQgCABgDAAIgmAAQgEAAgCgBQgCAAgBgCQgBgCgBgBQgBgCAAgEIAAgcQAAgFADgDQACgCAHAAIAmAAQADAAACAAQACABABABQACABAAACQABACAAADgAmNgQIgHAAIAKgMIAJAAIAKAMIgHAAIgHgHgAmMgmIALAAIgOAMIgHAAgAlzAdIAAgcIglAAIAAAcgAnaAdIAiAAIAAgmIAMAAIAAAmQAAAEgBACQAAABgCACQgBACgCAAQgCABgDAAIgjAAQgEAAgCgBQgCAAgBgCQgBgCgBgBQgBgCAAgEIAAgmIAMAAgAoogJIAOAAIAUAjIAUgjIAMAAIgcAyIgIAAg");
	this.shape_1.setTransform(56.275,5.05);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#E43157").s().p("AIdAoIAAgjIgWAdIgCAAIgWgdIAAAjIgMAAIAAgyIAOAAIAWAdIAWgdIAMAAIAAAygAGmAoIAAgyIA1AAIAAALIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAGRAoIAAgUIglAAIAAAUIgMAAIAAgyIAMAAIAAATIAlAAIAAgTIAMAAIAAAygAE5AoIAAgnIgYAAIAAgLIA7AAIAAALIgXAAIAAAngAEAAoIAAgjIgWAdIgDAAIgWgdIAAAjIgMAAIAAgyIAOAAIAXAdIAWgdIALAAIAAAygACJAoIAAgyIA0AAIAAALIgoAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAB3AoIgSgSIgTASIgOAAIAagaIgYgYIAPAAIARARIASgRIANAAIgYAYIAZAagAgBAoIAAgyIA0AAIAAALIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAgfAoIgnAAIAAgVIgHAAIAAgJIAHAAIAAgUIAnAAIAEAAIAEACIADAAIADACQAEACACAEQABADAAAJIAAAHIAAAHIgCAFQgCAEgDADIgDABIgDABIgEAAIgEAAgAg7AdIAcAAQAFAAACgCQADgDAAgEIAAgJQAAgGgDgCQgCgCgFAAIgcAAIAAAJIAWAAIAAAJIgWAAgAhrAoIgpgjIAAAjIgMAAIAAgyIAJAAIApAiIAAgiIAMAAIAAAygAjdAoIAAgyIA1AAIAAALIgpAAIAAAIIAYAAIAAALIgYAAIAAAJIApAAIAAALgAkTAoIAAgyIAMAAIAAAnIAmAAIAAALgAlMAoIAAgnIgYAAIAAgLIA7AAIAAALIgXAAIAAAngAmYAoIgGAAQAAAAgBAAQAAAAgBgBQAAAAgBAAQAAgBAAAAIgCgEIgBgFIAAgcQAAgGADgCQACgDAHAAIAmAAIAFACIADABQABAAAAABQAAAAAAAAQABABAAAAQAAABAAAAIABAFIAAAcIgBAFIgCAEIgDACIgFAAgAmYAdIAlAAIAAgcIglAAgAnaAoIgGAAIgDgCIgCgEIgBgFIAAgnIAMAAIAAAnIAiAAIAAgnIAMAAIAAAnIgBAFIgCAEQAAAAAAABQgBAAAAAAQgBABAAAAQgBAAAAAAIgFAAgAoKAoIgegyIAOAAIAUAkIAUgkIAMAAIgcAygAHIgQIgHgHIgIAHIgGAAIAKgNIAIAAIAKANgAAggQIgHgHIgIAHIgGAAIAKgNIAIAAIAKANgAi7gQIgHgHIgIAHIgGAAIAKgNIAIAAIAKANgAl+gQIgHgHIgIAHIgHAAIAKgNIAJAAIAKANgAAjgXIAAgCIAAgBIABgCIABgBIAGgDIAAgBIgKAAIAAABIgFgBIAAgBIABgEQAAAAABgBQAAAAAAAAQABAAABAAQAAgBABAAIAKAAIADABIACABIABABIAAADIAAACIAAABIAAABIgBAAIgBABIgGAEIAAABIAAABgAmWgZIAKgNIALAAIgOANg");
	this.shape_2.setTransform(56.275,5.05);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1}]}).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol57, new cjs.Rectangle(0,0,112.6,10.1), null);


(lib.Symbol51 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_5 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AhdBmQgZgMgKgXQgMgYAHgaIAIgVIADgTQAGggAZgXQAYgXAggFIAZgBIAYAAIAhAAQATABANAEQAVAHAOARQAPARAFAWQAKAqgZApQgSAegaALQgaALgmgGQgIgBgDABQgDABgIAEQgTALgWACIgIAAQgSAAgPgGg");
	mask.setTransform(13.6354,10.844);

	// Layer_1_copy_copy
	this.instance = new lib.Tagline();
	this.instance.setTransform(-132.3,-1.95,0.2079,0.2079);

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol51, new cjs.Rectangle(0,0,27.3,21.7), null);


(lib.Symbol50 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_6 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AgjBYQgSgFgNgNQgNgOgFgRQgEgLAAgYQABgZAGgMQAEgJAMgNQANgNAJgIQASgMAXgDQAWgCATAIQAVAJANASQAOATABAVIgBAaIgDAWQgEATgMAOQgMAQgRAGQgMAFgUACIgKAAQgSAAgOgEg");
	mask.setTransform(8.8563,9.2139);

	// Layer_1_copy_copy_copy
	this.instance = new lib.Tagline();
	this.instance.setTransform(-12.4,-29.3,0.2079,0.2079);

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol50, new cjs.Rectangle(0,0,17.7,18.5), null);


(lib.Symbol49 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_2 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AolC2QgRgEgMgKQgIgHgJgMIgOgFQgmgPgPgiQgLgaAGgrQAEgbAJgSQAIgQAPgNIAAgLQAAgOAEgPQAGgRAOgNQAGgIAGgHQAKgJAUgJQAogRAhAIQATAFASAOQARANALAPIAPgBQAPgBAdAGIBIAOIAqAHQAPACANAAIABgEIAEgNQAJgYAVgNQANgIAXgFQAYgMAPgDQApgIAjAYIAOAMIAPALQAGAEAFgBQAEgBAFgFQAngjBOgHQBSgGBFAUQAgALANABQAIAAAagDQAbgEAOgEQAOgEAbgMQAwgRAmAUQAYALANAYQALAJAGANIAHARQADAKAEAFQAGAIAMAHIAUAMQAiAWAFAlQADASgGASQgFASgNANQgNANgSAFQgTAGgSgFIgMgDQgHgCgFAAQgHAAgQAHQgWAIgZgCQgYgCgVgMQgQAWggAEQgXADghgIQgYgGgKgIQgHgGgDgBQgFgBgGADQgoAQgpgMQgJgDgFACIgIAIQgVAZgvgBQg1gCgsgVQgHgEgEABQgDAAgGAGQgXATgygFQgxgFgWgXQgVAHgWgDQgXgDgSgMIgIgDQgEgBgHAGQgeAXglgIQgTgGgKAAQgIAAgOAFQgPAFgHAAIgQAAQgKgBgGACIgCACQgJAagNATQgRAXgcAKQgSAHgRAAQgKAAgKgCg");
	mask.setTransform(67.0183,18.3926);

	// Layer_1
	this.instance = new lib.Tagline();
	this.instance.setTransform(2.05,3.8,0.2079,0.2079);

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol49, new cjs.Rectangle(2.1,3.8,132,33), null);


(lib.Symbol48 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_4 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("ALCCYQgSgBgQgJQgQgJgKgPQgEgGgCgHQgWgDgSgLQgMgIgFgCQgFgCgNAAQgYgBgMAFIgWAMQgMAHgSACIgfABQgqAAgVgEQgjgIgTgWQgXAXgiAFQgeAFgjgIQgTgFgHACIgUAIQgNAHgVABIgkACIg0AHIg4AEIg7AJQgbADhCgBIkSAAQgwAAgYgEQgogHgagVQgFgFgEgBQgDAAgGACQgxAQgxgTIgMAPIghgBQgZgBgRAHIgFADIgzgWIgKgDQgCgMACgLQABgKAEgMIAIgVQAIgWAEgbIgBgTIgGgLIgCgGIgBgFIAAgEIgBgDIAAgLQAAgUAMgRQASgcAhgEQASgDAQAGQAbgFAWAEQANACAKAFQAYADASALQAWAMALASIACAAQASAAAIACQAIABAOAGQAKADAUACQAOADALAGQAUgBATAEIASACQAHAAANgEQAYgEAWANQAIAGAEACQAJACARgJQASgJAYgCQAPgCAcAAQAnAAASAFIAVAFQAJACASgDIBagOQAPgDAFgDIAIgHIAHgJQAQgRAfgDQAMgBApAFQAlAGAIADQAaAJAKASQASgWAagNQAbgNAcAAQAJgBAOACIAWABQATABAlgCQAggBAUALQASAKALAUQALATABAWIAtgNQgCgTAFgSQAHgTANgMQAQgOAagEQAQgDAfABIA6ACQAoACAQAJQAYANAPAgQANAaADAdQAhAFATAcQAIANACARQACAQgFAPQgJAagmAeQgYAUgUAJQgYAMgUAAIgHgBg");
	mask.setTransform(85.1695,15.2516);

	// Layer_1_copy
	this.instance = new lib.Tagline();
	this.instance.setTransform(-26.5,-22.5,0.2079,0.2079);

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol48, new cjs.Rectangle(0,0,165,26.6), null);


(lib.Symbol44 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.lightcuaso();
	this.instance.setTransform(0,0,0.7723,0.7723);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol44, new cjs.Rectangle(0,0,349.1,339.8), null);


(lib.Symbol42 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.bgpngcopy1();
	this.instance.setTransform(-1,0,0.6657,0.6656);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol42, new cjs.Rectangle(-1,0,511.3,324.9), null);


(lib.Symbol29 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.fss();
	this.instance.setTransform(0,0,2.4915,2.4915);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol29, new cjs.Rectangle(0,0,1542.2,219.3), null);


(lib.hit = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("Egd/A1XMAAAhqtMA7/AAAMAAABqtg");
	this.shape._off = true;

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(3).to({_off:false},0).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-192,-341.5,384,683);


(lib.Tween18copy = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib._1001();
	this.instance.setTransform(-68,-60,0.3918,0.3918);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-68,-60,183.4,133.6);


(lib.Tween13 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.CTA();
	this.instance.setTransform(-119.05,-32.3,1.1339,1.1339);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-119,-32.3,238.1,64.69999999999999);


(lib.Symbol26copy2 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_3
	this.instance = new lib.HQM();
	this.instance.setTransform(5,3,0.1851,0.1851);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol26copy2, new cjs.Rectangle(5,3,47.2,54.8), null);


(lib.Symbol18copy = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_2
	this.instance = new lib.BBMATONG();
	this.instance.setTransform(5,5,0.1754,0.1754);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(5,5,34.7,53.5);


(lib.Symbol14copy3 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#373535").s().p("An3EsQgMgFgEgSQgCgLAAgNQAAgLACgPQAFgkANgpIAHgTIAGgOIgLAAIgLAAQg0gDgeghQgTgUgIgjIgEgVIAAgOIABgUIACgUQAGgmAUgtQAbhAA4g1QARgOAQgKQARgNASgHQAQgGAOgBQAQgCAOAFQAaAJAGAgIABAFQAEAXgFAcIgGAVIgGAVIgIAWIgIAVIgBAFIgBAFIAPgHIAYgJIA0gVIBNgeIBBgXIBCgWIBRgbIAYgHQACgBAFACIgCACIiXAyIgxARQgdAJgUAIIhBAZIg3AWIgJAFIgPAFIgNAFQgFADgDADQgEADgCAGIgQAkIgPAjIgIARIAAACIAAACIADAHQAPAiAHAmIAKgFIAJgGIAYgSIAZgSIAXgQIACAAIADgBIAAABQAJAHAFgCQAFgCACgJQACgPAKgKQAIgJAPgIQA+gjBFgeIBFgeIBEgdIBbgjIBcgjIAOgFIAOgFIABACIgPAGIgrAQIgrAQIhyAsQhMAggrAUQgrASg3AdIgcAQIgdASQgRAJgDAQIgBAHIgEAHQgCAGgGABQgGABgGgCQgEgCgDAAQgDAAgEADIg3ApIgNAIIgNAIIgCACIgBADQACAZgFAdIgBACQgDAWgJAcQgJAdgMAdQgMAYgUANQgKAHgJAAQgFAAgEgCgAmdBcIgiAPQgSAIgQACIgDABIgBADIgKAdIgJAeQgIAhgCAcQgCAOABAJQABAMAEAKQADAGAFADQAHADAHgCQAIgCAIgGQALgKAJgNQAGgLAHgQQAPgpAJgvIACgHIACgZIAAgbIgCABgAnXkRQgqAbgfApIgPAUIgPAWQgTAjgOAuQgHAWgCAUQgDAWABATIAEARIADARQAFAOAFALQAHANAKAIQAlAkA5gEIAEgCIABgDIArhfIACgGIABgCIgBgEQgIgOgMgKIgKgGIgWgOQgEgDABgCIADgDIAEgDIADgBIAWgLIAXgLIAsgVIAHgFIAEgGIALghIALgfQAIgYACgRQACgUgDgRIgCgGQgDgQgJgKQgLgKgPgBIgLAAQgiAAggAVgAnjBvIAGAAQAPgDARgGIAfgOIABgCIABgCQgGgmgRgiIgCgDgAm5hJIgWALIgYAOQAQAKAKAHIADADQAPALAIAPIAqhbIgBgBIgvAVgABeC0QgEgBgBgDQgBgCACgEQAFgKANgGIABACIgDAEIgGAFIgFAFQAAABAAAAQAAABAAAAQAAABAAAAQAAABAAAAQAAABAAAAQAAABABAAQAAAAABAAQABAAABAAIAhgDQAVgDAfgHIAxgNIADgBQBGgRA8gYQA2gVAogXIAWgOQAMgJAJgKQAPgRADgVIADgnIAEgoIgCgDIgGgKIgJAKIgEAFIgEACQgFADgEgDQgEgCgDgFIgDgIIgEAHQAAAGgCACIgDAGIgDACIgDABIAAgDIgBgCIAIgXIADgEQAEgEACAAQACABACAFIADAFIACAFQACAGADABQADAAAEgEIARgVIACgBIADAAIABACIAAACIAAAFIAAAGIAFgOQAEgHAIgEIAEAHQAAAEgCAEQgBADgDAFIgFAHIgDAEIgBAFIgDAeIgCAfIgEAWQgDAKgFAIQgFALgKAJQgIAIgLAIQgYAQgbAOQgYAMgeAMQhAAZhFARIgIACIgoAMIgqAJIgcAEIgbADIgHAAgAIWhhIADABIAIgOIgCgBgAjpCpIAAgBIABgSIACgPIAIghIAJgUIAKgSIAEgEIACgBIAEADIACADIACAJIACAJIACALIAEAKQADAHAEABIAFgCIACgDIAJgNIACgEIAFgRQAEgMABgIQABgMgDgKIgEgKIgFgJIgBgDIgCgDIgCADIAGAYIgDgBIgBgBIgHgXIAAgDIADgCIACAAIACAAQALAIAEAKQADAKAAAOQABAOgEAQQgFANgHAOIgCACQABABAAAAQAAAAAAABQAAAAgBAAQAAABAAAAIgIAHIgCABQgDABgDAAQgFgBgCgDQgDgDgCgFIgDgMIgDgMIgDgOIgBAAIgKARQgFAJgBAJQgBALgDAPIgGAXIgBACIgDAQIgDACIgCABIgBgCgAhyB8QgEgFABgFIAEgNQAEgHACgIIACgRIAAgNIgEAFQgDAFgEABQgFACgDgEQgEgDAAgFQAAgFAEgEQAHgHAKABIADgBIABgEIACgGIABgBIACgBIABABIACABIgBAEIAAADIgDAlIAEgGIAEgFIAGgJQADgDADAAQABAAACAFIACAEIACAFIABAEIABAEQAFgFgCgGQAAgHgGgFIgCgBIgCgCIAAgDQAAAAAAAAQAAAAAAgBQAAAAAAAAQAAAAAAAAIACgCIACABQAHACAFALQAEALgFAIQgCAFgFAAQgFAAgCgFIgDgIIgCgIIgJAMIAAABQgJAKgCAMQgCALAAAPIgBAFIgBAEQgFAAgEgFgAhwBwQAAADAEAEIABgSQgEAGgBAFgAh0AxQgEACgBAFIAAADIAAACIAEAAIACgBIAGgGIAEgIIgBAAQgFAAgFADgAAoA5IABgHQANgwAMhBQAAAAAAAAQAAgBAAAAQABgBAAAAQAAAAAAgBIADgCQABAAAAABQABAAAAAAQAAABAAAAQAAAAAAABIAAAEIgGAeIgGAeIgGAYIgHAbIgBAGIA3geIABACIgCACIgCACIgxAeIgEABIgHABIACgHgAI8AoIgBgCIAEgKIADgJIADgLIgMACIgJABIgDgBIgCgBIACgCIACgCIAVgCQABAAABAAQAAAAABgBQAAAAABAAQAAAAABgBIABgCIAHgUIACgDIACgCIACADIABACIgCALIAAALIALgCIAJgBIADAAIADAAIgBACIgCAEIgJAIIgKAIIgBACIgDADIAAABIgBABIgPAKIABgDIABgDIADgEIAFgFQgCgCgFgEIgHATIgCAFIgBABIgCACIgBgDgABaAZQgFgCgCgEQAAgDACgEQAEgJALgDQANgGARACIACABIADACIgDABIgDAAIgDAAIgDAAIABAFIABADIACACIADABQABAAAAAAQAAAAABAAQAAAAAAgBQABAAAAAAQAAAAABgBQAAAAAAgBQAAAAABgBQAAAAAAgBIAGgIQACgHACgDQAGgKALgDQAEgBACABQABABAAAFIAAAFIgBAFIgCAHIAigSIABACIgBABIgBACIgcAQIgGACQgDABgBgCQgCgCABgCIACgQQgGADgEAEQgEAFgCAGIgDAHQgCAFgDACQgEAEgGgBQgEABgFgFIgIAHIgJAFQgCABgEAAIgGgBgABmAEQgHAEgEAGQgDAEAGACQAHABAIgGQAGgGAAgIQgIABgFACgAhOARQAAAAAAgBQAAAAgBgBQAAAAAAgBQAAAAAAgBIABgJIAGgJIAEgKIADgGIAAgGIABgEQAAgBABAAQAAAAABgBQAAAAABAAQAAAAABAAQABAAAAABQABAAAAAAQAAABAAAAQAAAAAAABIAAAEIgBACIABADIAHgDIAIgDIA3gcIACgBIACgBIAAACIgFADIgwAcIgKAHQgHACgGgBIgCAAIgBACIgKAZIAEABIAAACIgFACIgDABIgBAAgADuACIAEgEIADgGQADgHAFgQIAOgrIgBgBIgNAIIgMAHQgGAEgBAIQgBADAAALIgBAAIgCgCIgBgBQgCgLAFgJQADgKALgEIATgJIAEgCQAAAAAAAAQAAAAABgBQAAAAAAgBQAAAAAAgBIAGglIAAgCIAAgDIACgBIACgBIACABIABACIAAAIQgCAKgDAYIAggJIAygPIADgBIACgDIAFggIAFghQAAgBAAgBQAAAAABgBQAAAAAAgBQAAAAABAAIACgCQABAAAAAAQAAAAABAAQAAAAAAAAQAAAAAAAAQAJAJAHAJIABACIABAEIgPgQIgCAAIgLBCIAWgJIAAACIgBABIgDACIgHADIgHACQgBAAAAABQAAAAgBAAQAAABAAAAQgBAAAAABIgCACIgQBLIgBAHIAAAGIACABIAIgKQABAEgEAGQgCAEgEAAQAAAAgBAAQgBAAAAAAQgBAAAAAAQgBgBAAAAIgBgEQgBgMACgHIAOhGIgDAAIgBAAIhTAaQgBABAAAAQgBAAAAAAQAAABgBAAQAAAAAAABIgDAEIgTA6IgHANIgCACIgDABgAGHgoQgFgCgDgIIgBgEIgGAIIgBgBIAAgCIAAgBIALgZIABgDIABgBIACgDIADAAQAAAAABAAQAAAAAAABQABAAAAAAQAAAAAAABIgBADIgFALQgBAGABAGIABAEIAEADIADgBIAFgDQAEgEACgJIADgNIAAgCIABgBIADgEIACACIABACIAAADIAAADIAAADIABADIADADIACADQAAAAABAAQAAAAAAAAQABAAAAAAQABAAAAgBQABAAAAAAQABAAAAgBQAAAAABAAQAAgBAAAAIAEgHQADgCACgGIACgDQACgCADAAIgDALQgBAHAEAFQAFgGAAgHQAAgEgDgJIgGABQgCAAgCgBIgEgDIgCgFIgMALIgCgBIABgDIACgCQAKgKAMgKQAAAAABgBQAAAAAAAAQAAAAAAAAQABAAAAAAIADABIgBADIgCACIgDAFIgDAEIAAADQAAABAAAAQAAAAABABQAAAAABAAQAAAAABAAQAGAAAGgGQAIgGAAgGIABgCIADgDIACADIAAAEQgBAFgEAEQgCAEgHADIgCACQAGAGgBALQgBALgGAFQgFADgFgFIgBgCIgBgCIgHAEQgDADgCAAQgDABgEgCQgFgDgCAAIgBADIgDAFIgEAHQgGAFgFAAIgCAAg");
	this.shape.setTransform(71.05,30.1675);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	// Layer_5_copy
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#8300C7").s().p("AqwCSQgRgEgHgNQgHgLgBgRQgCgtAYgiQALgOAPgGQASgFANAHQANAJABASIAAACQAAAKgCACQgDADgJgBIgBgKIgBgKQgCgJgGgDQgGgDgIACQgMADgJAMQgaAkAHAsQABAKAGAGQAFAFAIACQAGABAGgCQAFgCAFgFIAHgJIAHgKIALAEQgGAPgJAJQgLAKgQADgAj9CPQgKgBgEgIQgFgIAFgJQAFgHAGgEIANgHIANgFQAHgCADgEQADgEAAgHIgHAEQgKAHgKgEQgLgEgCgMQgDgMAEgLQADgLAKgJQAIgHAJAAQAJAAALAGIADgGIAMgBIgQBEQARgLAKgQIAAgDIABgDQACgVANgMQAOgNAQAGQAOAGAAATQAAAZgPAPQgMALgOgDQgGgBgEgEQgDgDgEgGQgLAQgUALIgBACIgBACIgGANQgDAIgDAFQgFAIgHADQgHAEgIAAIgDAAgAjrBqIgKAFQgGADgDAFQgBABAAAAQAAABAAAAQAAABgBAAQAAABAAAAQAAABAAAAQAAABAAABQAAAAAAAAQABABAAAAQAAABAAAAQAAABABAAQAAAAABABQAAAAABAAQAAABABAAQABAAAAAAQABAAAAAAQAAAAABAAQAKgCADgEIAHgKIAGgLIgCgDIgLAFgAjiAdQgKADgGAKQgGALAEAMQABAGAFACQAFACAGgDQAGgEADgFIAIgWQACgFgCgCQgBgCgFgCIgGgBgAiXAXQgFADgDAFQgJAOACAQQAAAFACADQACADAFABQAHACAHgHQAJgLABgQQAAgHgCgFQgCgFgEgBIgEgBIgGABgAphB7QgKgCgFgKQgHgNAFgTQAEgSANgIQAIgFAHAAQAIABAJAHQAAgHAFgBIAJgBIgKAuIgBAFIABAFIABAEIAFgCIAEgCIAHgHIAHgJIAHAGQgEAJgFAFQgFAHgHADQgHAEgGgCQgFgBgFgIIgCADIgCADQgHAHgJAAIgDAAgApSA8QgHABgFAFQgFAFgCAHQgCAGAAAJIAAAGIADAHQACADAEABQAHACAGgIIAFgHIAHgbIAAgDIgCgEQgEgDgGAAIgBAAgAlwB2IAKgoIAXheQABgHACgCQACgBAIAAIAEAAIAVB0IABAAIAPhBIAGgYIAFgYQABgFACgCQADgCAFABIAFAAIgJAjIgMAzIgMAyQgBAFgDABQgCACgEAAIgJAAIgUhxIgBAAIgZBsQgCAIgCABIgFABIgHAAgAn0BwQgFgBgHgFQgFgDgBgEQAAgEADgGIAJgXIAKgYIACgDIACgBQAIgBACADQALASAGAOQAFANgHAOQARgKAGgTIADgMIADgMQACgIACgBQACgBAJABIgFARIgEASQgCAHAAAKIAAAEIADACIADAAIAEgBIAIgJIAIgJIAHAGQgFAJgEAFQgGAHgIADQgRAJgHgVIgCADIgBACQgPAPgVAAIgNgCgAn6BhQAFAEAFACQAFABAFgCQAFgCADgFQACgEAAgHQAAgIgEgIIgHgOgAhEgCIAJgnQABgFACgCQADgCAEAAIAGABIggCDIAwgEQAAAJgCACQgBABgJABIg1AEgAH+BPQgKgBgFgHQgEgIAFgJIAFgHIAGgFQALgGAQgGQAHgDACgCQACgDAAgJQgMAJgIAAQgHAAgJgJIgEAFIgDAEIgGAGIgHAEQgEADgEAAQgFAAgEgDQgEgDgBgEQgBgEABgFIADgLIADgKIADgHIABgHQAAgEgCgCQgCgCgEABQgFABgEAEQgEADgDAFQgGAJgEAKQgDAJgDAMQgCAIgCABQgCACgJgBIAIghIgQABIgDAIIgDAHQgGAPgNAFQgUAKgOgWIgCADIgDADIgFAFIgEAEQgJAGgHgDQgHgDgCgLIgCADIgCACIgGAGQgEAEgDABQgJAEgGgEQgHgEgBgJQgCgKACgLIAFgTIACgHQADgIACgBQACgCAJABIgFAQIgEAQQgCAJAAAJIACAFIADADIAFAAQABAAABgBQAAAAABAAQABAAAAgBQAAAAABAAQAGgHADgHQAGgQAGgXQABgEACgBQACgCADABQAEAAACgDQACgDgBgDQgBgFACgDIAFgFQAFAIgBAJQgCAJgHAGIgDADIgCAEQgFASgCAMIAAAGIACAFIAGgBIAFgDQAGgFADgGQAEgGABgIQACgPAMgLQAOgNAQAFQAEABADgDQADgEgBgFQgBgEACgDIAGgFQADAIAAAHQgBAIgFAGQgCACABAEIABADIABADQAAADABACQACACAEAAQAGAAADgCQAFgCAAgEIAGgVIAMgBIgDAPIADgEIACgDIAJgGIAJgFQAIgCAGAFQAGAFgCAJIgCAKIgDAJIgDAIIgCAIIAAAEQAAAAAAABQAAAAABABQAAAAAAAAQAAABABAAIAEAAQAAAAABAAQABAAAAAAQAAAAABgBQAAAAAAAAQAIgGADgFQAFgHAAgHQgBgPALgNQAJgKAKgBQALgBAMAHIACgHIANAAIgRBEIARgGIAPgGIAegMIAdgOQASgKANgJQAQgLAKgMQAJgKgBgLQgBgLgKgIQgDgDgFAAQgFgBgEABQgFACgPAIIgWAOQgEACgEAAQgFAAAEgVQAEgVgGgHQgGgIgHABQgFABgFAEQgMAJgEAIQgGAJgBAPIgBAHQgCADgEgBQgEAAgBgDQgBgCABgMQABgMAIgNQAFgHAJgJQASgSASAKQASAKgDAlQAAgCAOgHQAPgIAFgBQATgDANAOQAJAJAAAQQAAARgMAMQgcAbgiAQIgoATQgjAQgUAHIgBAEIgCAEIgGALIgGALQgIALgQAAIgDAAgAIQAqIgJAFQgGADgFAGIgBAEIAAAEQABAAAAABQAAAAABABQAAAAABAAQAAABABAAIAEABQAIgCAEgEQAFgEADgGIAFgNIgCgBIgKAEgAF+gSQgEACgEAGQgJANACAPQABAKAIADQAHACAHgHQAKgLABgPQAAgIgDgFQgCgFgEgBIgDgBIgHACgAIZghQgLACgFALQgGALADAKQACAGAFADQAFACAGgEQAGgDACgFQAEgIAFgNQABgFgBgCQgBgDgFgBIgHgCIgDABgAgOBJQgFgCgEgFQgFgHgBgLQgBgJAEgLQADgKAGgIQAHgIAIgCQAGgCAGACQAGABAGAFQABgGAEgBIAKAAIgJAkIgDARQgBAFADABQACABAFgCQANgJAEgPIAEgOIAEgOQACgGABgCQACgBAJABIgDAMIADgEIADgDIAIgFIAJgEQAIgDAGAFQAFAFAAAHIgCAIIgCAHIgEALIgDAKIABAEIABAFIAFgBIAEgCIAHgIIAIgJIAHAGQgFAKgFAFQgGAIgJADQgKADgGgFQgHgFACgKIADgLIADgKIACgIIACgHQABgFgDgCQgCgCgEACQgKAFgFAHQgGAIgEAMQgEAIgDAOQgCAHgBACQgCABgJAAIAAgFQgMAJgHgBQgHAAgEgIIgJAGIgHAEIgGABIgGgBgAAEAKQgFABgFAFQgFAFgCAHQgCAGgBAIIABAFIAAAFQADAHAGACQAGABAEgFQAEgEABgDIAJgdIgBgEIgCgDQgEgEgFAAIgCAAgACqBKIgFAAIAOg9IgYACQAAgJACgCQACgCAIAAQALgBADgBQACgCADgKIALgwQADgJABgBQADgBAJABIgRBGIAvgDIACgCIABgDIAPg7QABgFACgCQADgCAEAAIAGAAIgKApIgXBfQgBAFgCACQgDACgFAAIgFAAIAOg9IgkADQgKABgCACQgCACgCAJIgFAUIgEAUQgBAFgDACQgCACgDAAIgCAAgAmrAYQgHAAABgIQAAgEADgDQADgEAEAAQAGAAABAHQAAAFgEAEQgCADgEAAIgBAAgAm5gFQABgFAEgDQADgDAEAAIAIADIADABQAGADACgCQACgBABgGIAIgBIAAAJQAAAEgDADQgDADgEAAQgEAAgEgBIgGgDQgEgBgCAAQgDABgBAEIgDACIgFADQgBgGABgEgAiiAEIALgNIAMgOQACgDAFACQAEABACADIAIAUQgIACgCgBQgCgBgCgGIgDgHIgGAGIgFAGQgFAFgHAAIgEAAg");
	this.shape_1.setTransform(73.1175,60.6714);

	this.timeline.addTween(cjs.Tween.get(this.shape_1).wait(1));

	// Layer_5
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f().s("#FFFFFF").ss(1,1,1).p("AGmAlIAIghIgQABQgBADgCAFQgBAEgCADQgGAPgNAFQgUAKgOgWIgCADQgCACgBABQgEAEgBABQgCACgCACQgJAGgHgDQgHgDgCgLQgBACgBABQgBABgBABQgEAEgCACQgEAEgDABQgJAEgGgEQgHgEgBgJQgCgKACgLQABgHAEgMQAAgBACgGQADgIACgBQACgCAJABQgCAGgDAKQgDAJgBAHQgCAJAAAJQAAACACADQABACACABQACAAADAAQADgBACgBQAGgHADgHQAGgQAGgXQABgEACgBQACgCADABQAEAAACgDQACgDgBgDQgBgFACgDQABgBAEgEQAFAIgBAJQgCAJgHAGQgCABgBACQgCACAAACQgFASgCAMQgBACABAEQABACABADQACAAAEgBQADgBACgCQAGgFADgGQAEgGABgIQACgPAMgLQAOgNAQAFQAEABADgDQADgEgBgFQgBgEACgDQABgBAFgEQADAIAAAHQgBAIgFAGQgCACABAEQAAABABACQAAACABABQAAADABACQACACAEAAQAGAAADgCQAFgCAAgEIAGgVIAMgBIgDAPQABgCACgCQABgCABgBQADgCAGgEQAFgDAEgCQAIgCAGAFQAGAFgCAJQAAAEgCAGQgBADgCAGQgBACgCAGQgCAEAAAEQgBABABADQAAACACABQABAAADAAQACAAABgBQAIgGADgFQAFgHAAgHQgBgPALgNQAJgKAKgBQALgBAMAHIACgHIANAAIgRBEQAGgCALgEQAJgDAGgDQAbgLADgBQARgIAMgGQASgKANgJQAQgLAKgMQAJgKgBgLQgBgLgKgIQgDgDgFAAQgFgBgEABQgFACgPAIIgWAOQgEACgEAAQgFAAAEgVQAEgVgGgHQgGgIgHABQgFABgFAEQgMAJgEAIQgGAJgBAPQgBAFAAACQgCADgEgBQgEAAgBgDQgBgCABgMQABgMAIgNQAFgHAJgJQASgSASAKQASAKgDAlQAAgCAOgHQAPgIAFgBQATgDANAOQAJAJAAAQQAAARgMAMQgcAbgiAQQgbAMgNAHQgjAQgUAHQAAABgBADQgBACgBACQgEAHgCAEQgDAHgDAEQgJAMgSgBQgKgBgFgHQgEgIAFgJQACgEADgDQADgDADgCQALgGAQgGQAHgDACgCQACgDAAgJQgMAJgIAAQgHAAgJgJQgDADgBACQgCACgBACQgEAEgCACQgEACgDACQgEADgEAAQgFAAgEgDQgEgDgBgEQgBgEABgFQABgEACgHQADgJAAgBQACgFABgCQABgEAAgDQAAgEgCgCQgCgCgEABQgFABgEAEQgEADgDAFQgGAJgEAKQgDAJgDAMQgCAIgCABQgCACgJgBgAGRAAQAAgIgDgFQgCgFgEgBQgFgBgFACQgEACgEAGQgJANACAPQABAKAIADQAHACAHgHQAKgLABgPgAClBKIAOg9IgYACQAAgJACgCQACgCAIAAQALgBADgBQACgCADgKIALgwQADgJABgBQADgBAJABIgRBGQAlgCAKgBQABAAABgCQABgCAAgBQAKgnAFgUQABgFACgCQADgCAEAAQACAAAEAAQgEAOgGAbQgSBHgFAYQgBAFgCACQgDACgFAAQAAAAgFAAIAOg9QgZACgLABQgKABgCACQgCACgCAJQgCAHgDANQgDAMgBAIQgBAFgDACQgCACgFAAgABJgDIgDAMQABgCACgCQABgCACgBQADgCAFgDQAFgDAEgBQAIgDAGAFQAFAFAAAHQgBADgBAFQAAABgCAGQgBADgDAIQgCAGgBAEQAAACABACQAAACABADQABgBAEAAQADgBABgBQADgDAEgFQACgDAGgGIAHAGQgFAKgFAFQgGAIgJADQgKADgGgFQgHgFACgKQAAgEADgHQADgJAAgBQACgFAAgDQACgEAAgDQABgFgDgCQgCgCgEACQgKAFgFAHQgGAIgEAMQgEAIgDAOQgCAHgBACQgCABgJAAIAAgFQgMAJgHgBQgHAAgEgIQgGAEgDACQgFADgCABQgGACgGgCQgFgCgEgFQgFgHgBgLQgBgJAEgLQADgKAGgIQAHgIAIgCQAGgCAGACQAGABAGAFQABgGAEgBQADAAAHAAQgHAbgCAJQgDAKAAAHQgBAFADABQACABAFgCQANgJAEgPQACgFACgJQACgJACgFQACgGABgCQACgBAJABgAIcgiQgDABAAAAQgLACgFALQgGALADAKQACAGAFADQAFACAGgEQAGgDACgFQAEgIAFgNQABgFgBgCQgBgDgFgBQgBgBgGgBgAIcAnIgCgBQgGADgEABQgFADgEACQgGADgFAGQgBABAAADQAAACAAACQABACADABQACABACAAQAIgCAEgEQAFgEADgGQADgFACgIgAmXgSIAIgBQABAFgBAEQAAAEgDADQgDADgEAAQgEAAgEgBQgCgBgEgCQgEgBgCAAQgDABgBAEQAAABgDABQgDACgCABQgBgGABgEQABgFAEgDQADgDAEAAQADABAFACIADABQAGADACgCQACgBABgGgAkoBaIAPhBQAEgQACgIQADgOACgKQABgFACgCQADgCAFABIAFAAIgJAjQgEARgIAiQgIAdgEAVQgBAFgDABQgCACgEAAQgBAAgIAAIgUhxQgBAAAAAAIgZBsQgCAIgCABQgCACgKgBQAHgbADgNQALguAMgwQABgHACgCQACgBAIAAIAEAAIAVB0gAmgAMQAAAFgEAEQgDAEgEgBQgHAAABgIQAAgEADgDQADgEAEAAQAGAAABAHgAnTBjQARgKAGgTQABgEACgIQACgIABgEQACgIACgBQACgBAJABQgBAGgEALQgDALgBAHQgCAHAAAKQAAACAAACQABACACAAQABABACgBQADAAABgBQADgEAFgFQACgDAGgGIAHAGQgFAJgEAFQgGAHgIADQgRAJgHgVQgBACgBABQAAABgBABQgTATgegGQgFgBgHgFQgFgDgBgEQAAgEADgGQADgJAGgOQAHgRADgHQAAgBACgCQABgBABAAQAIgBACADQALASAGAOQAFANgHAOgAn6BhQAFAEAFACQAFABAFgCQAFgCADgFQACgEAAgHQAAgIgEgIQgCgGgFgIgAqwCSQgRgEgHgNQgHgLgBgRQgCgtAYgiQALgOAPgGQASgFANAHQANAJABASIAAACQAAAKgCACQgDADgJgBQgBgHAAgDQAAgGgBgEQgCgJgGgDQgGgDgIACQgMADgJAMQgaAkAHAsQABAKAGAGQAFAFAIACQAGABAGgCQAFgCAFgFQADgDAEgGQAFgHACgDIALAEQgGAPgJAJQgLAKgQADgApKBuIgCADQgBACgBABQgIAIgLgBQgKgCgFgKQgHgNAFgTQAEgSANgIQAIgFAHAAQAIABAJAHQAAgHAFgBQADgBAGAAIgKAuQgBAEAAABQAAACABADIABAEQACgBADgBQADgBABgBQADgDAEgEQAEgGADgDIAHAGQgEAJgFAFQgFAHgHADQgHAEgGgCQgFgBgFgIgApnBdQAAAEAAACQABAEACADQACADAEABQAHACAGgIQAEgEABgDQAFgQACgLQABgBgBgCQgBgCgBgCQgFgEgGABQgHABgFAFQgFAFgCAHQgCAGAAAJgAhcBfIAYhhQAFgXAEgQQABgFACgCQADgCAEAAQABABAFAAIggCDIAwgEQAAAJgCACQgBABgJABQgGABgvADgAgQAqQAAACABADQAAADAAACQADAHAGACQAGABAEgFQAEgEABgDQAGgQADgNQAAgCgBgCQAAgCgCgBQgEgEgHAAQgFABgFAFQgFAFgCAHQgCAGgBAIgAh2AAQgIACgCgBQgCgBgCgGIgDgHQgDACgDAEQgFAGAAAAQgHAHgJgCQAEgEAHgJQAHgIAFgGQACgDAFACQAEABACADgAjOAYIADgGQADAAAJgBIgQBEQARgLAKgQQAAgBAAgCQABgCAAgBQACgVANgMQAOgNAQAGQAOAGAAATQAAAZgPAPQgMALgOgDQgGgBgEgEQgDgDgEgGQgLAQgUALQgBAAAAACQgBABAAABQgCAFgEAIQgDAIgDAFQgFAIgHADQgIAEgKAAQgKgBgEgIQgFgIAFgJQAFgHAGgEQAIgFAFgCQAHgDAGgCQAHgCADgEQADgEAAgHQgFADgCABQgKAHgKgEQgLgEgCgMQgDgMAEgLQADgLAKgJQAIgHAJAAQAJAAALAGgAjeAdIgEAAQgKADgGAKQgGALAEAMQABAGAFACQAFACAGgDQAGgEADgFQADgIAFgOQACgFgCgCQgBgCgFgCQgBAAgFgBgAjeBoIgCgDQgHADgEACQgGADgEACQgGADgDAFQgCACAAACQAAADABABQAAACADABQACACACgBQAKgCADgEQADgEAEgGQACgEAEgHgAiFApQAAgHgCgFQgCgFgEgBQgFgCgFACQgFADgDAFQgJAOACAQQAAAFACADQACADAFABQAHACAHgHQAJgLABgQg");
	this.shape_2.setTransform(73.1175,60.6714);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#8300C7").s().p("AqwCSQgRgEgHgNQgHgLgBgRQgCgtAYgiQALgOAPgGQASgFANAHQANAJABASIAAACQAAAKgCACQgDADgJgBIgBgKIgBgKQgCgJgGgDQgGgDgIACQgMADgJAMQgaAkAHAsQABAKAGAGQAFAFAIACQAGABAGgCQAFgCAFgFIAHgJIAHgKIALAEQgGAPgJAJQgLAKgQADgAj9CPQgKgBgEgIQgFgIAFgJQAFgHAGgEIANgHIANgFQAHgCADgEQADgEAAgHIgHAEQgKAHgKgEQgLgEgCgMQgDgMAEgLQADgLAKgJQAIgHAJAAQAJAAALAGIADgGIAMgBIgQBEQARgLAKgQIAAgDIABgDQACgVANgMQAOgNAQAGQAOAGAAATQAAAZgPAPQgMALgOgDQgGgBgEgEQgDgDgEgGQgLAQgUALIgBACIgBACIgGANQgDAIgDAFQgFAIgHADQgHAEgIAAIgDAAgAjrBqIgKAFQgGADgDAFQgBABAAAAQAAABAAAAQAAABgBAAQAAABAAAAQAAABAAAAQAAABAAABQAAAAAAAAQABABAAAAQAAABAAAAQAAABABAAQAAAAABABQAAAAABAAQAAABABAAQABAAAAAAQABAAAAAAQAAAAABAAQAKgCADgEIAHgKIAGgLIgCgDIgLAFgAjiAdQgKADgGAKQgGALAEAMQABAGAFACQAFACAGgDQAGgEADgFIAIgWQACgFgCgCQgBgCgFgCIgGgBgAiXAXQgFADgDAFQgJAOACAQQAAAFACADQACADAFABQAHACAHgHQAJgLABgQQAAgHgCgFQgCgFgEgBIgEgBIgGABgAphB7QgKgCgFgKQgHgNAFgTQAEgSANgIQAIgFAHAAQAIABAJAHQAAgHAFgBIAJgBIgKAuIgBAFIABAFIABAEIAFgCIAEgCIAHgHIAHgJIAHAGQgEAJgFAFQgFAHgHADQgHAEgGgCQgFgBgFgIIgCADIgCADQgHAHgJAAIgDAAgApSA8QgHABgFAFQgFAFgCAHQgCAGAAAJIAAAGIADAHQACADAEABQAHACAGgIIAFgHIAHgbIAAgDIgCgEQgEgDgGAAIgBAAgAlwB2IAKgoIAXheQABgHACgCQACgBAIAAIAEAAIAVB0IABAAIAPhBIAGgYIAFgYQABgFACgCQADgCAFABIAFAAIgJAjIgMAzIgMAyQgBAFgDABQgCACgEAAIgJAAIgUhxIgBAAIgZBsQgCAIgCABIgFABIgHAAgAn0BwQgFgBgHgFQgFgDgBgEQAAgEADgGIAJgXIAKgYIACgDIACgBQAIgBACADQALASAGAOQAFANgHAOQARgKAGgTIADgMIADgMQACgIACgBQACgBAJABIgFARIgEASQgCAHAAAKIAAAEIADACIADAAIAEgBIAIgJIAIgJIAHAGQgFAJgEAFQgGAHgIADQgRAJgHgVIgCADIgBACQgPAPgVAAIgNgCgAn6BhQAFAEAFACQAFABAFgCQAFgCADgFQACgEAAgHQAAgIgEgIIgHgOgAhEgCIAJgnQABgFACgCQADgCAEAAIAGABIggCDIAwgEQAAAJgCACQgBABgJABIg1AEgAH+BPQgKgBgFgHQgEgIAFgJIAFgHIAGgFQALgGAQgGQAHgDACgCQACgDAAgJQgMAJgIAAQgHAAgJgJIgEAFIgDAEIgGAGIgHAEQgEADgEAAQgFAAgEgDQgEgDgBgEQgBgEABgFIADgLIADgKIADgHIABgHQAAgEgCgCQgCgCgEABQgFABgEAEQgEADgDAFQgGAJgEAKQgDAJgDAMQgCAIgCABQgCACgJgBIAIghIgQABIgDAIIgDAHQgGAPgNAFQgUAKgOgWIgCADIgDADIgFAFIgEAEQgJAGgHgDQgHgDgCgLIgCADIgCACIgGAGQgEAEgDABQgJAEgGgEQgHgEgBgJQgCgKACgLIAFgTIACgHQADgIACgBQACgCAJABIgFAQIgEAQQgCAJAAAJIACAFIADADIAFAAQABAAABgBQAAAAABAAQABAAAAgBQAAAAABAAQAGgHADgHQAGgQAGgXQABgEACgBQACgCADABQAEAAACgDQACgDgBgDQgBgFACgDIAFgFQAFAIgBAJQgCAJgHAGIgDADIgCAEQgFASgCAMIAAAGIACAFIAGgBIAFgDQAGgFADgGQAEgGABgIQACgPAMgLQAOgNAQAFQAEABADgDQADgEgBgFQgBgEACgDIAGgFQADAIAAAHQgBAIgFAGQgCACABAEIABADIABADQAAADABACQACACAEAAQAGAAADgCQAFgCAAgEIAGgVIAMgBIgDAPIADgEIACgDIAJgGIAJgFQAIgCAGAFQAGAFgCAJIgCAKIgDAJIgDAIIgCAIIAAAEQAAAAAAABQAAAAABABQAAAAAAAAQAAABABAAIAEAAQAAAAABAAQABAAAAAAQAAAAABgBQAAAAAAAAQAIgGADgFQAFgHAAgHQgBgPALgNQAJgKAKgBQALgBAMAHIACgHIANAAIgRBEIARgGIAPgGIAegMIAdgOQASgKANgJQAQgLAKgMQAJgKgBgLQgBgLgKgIQgDgDgFAAQgFgBgEABQgFACgPAIIgWAOQgEACgEAAQgFAAAEgVQAEgVgGgHQgGgIgHABQgFABgFAEQgMAJgEAIQgGAJgBAPIgBAHQgCADgEgBQgEAAgBgDQgBgCABgMQABgMAIgNQAFgHAJgJQASgSASAKQASAKgDAlQAAgCAOgHQAPgIAFgBQATgDANAOQAJAJAAAQQAAARgMAMQgcAbgiAQIgoATQgjAQgUAHIgBAEIgCAEIgGALIgGALQgIALgQAAIgDAAgAIQAqIgJAFQgGADgFAGIgBAEIAAAEQABAAAAABQAAAAABABQAAAAABAAQAAABABAAIAEABQAIgCAEgEQAFgEADgGIAFgNIgCgBIgKAEgAF+gSQgEACgEAGQgJANACAPQABAKAIADQAHACAHgHQAKgLABgPQAAgIgDgFQgCgFgEgBIgDgBIgHACgAIZghQgLACgFALQgGALADAKQACAGAFADQAFACAGgEQAGgDACgFQAEgIAFgNQABgFgBgCQgBgDgFgBIgHgCIgDABgAgOBJQgFgCgEgFQgFgHgBgLQgBgJAEgLQADgKAGgIQAHgIAIgCQAGgCAGACQAGABAGAFQABgGAEgBIAKAAIgJAkIgDARQgBAFADABQACABAFgCQANgJAEgPIAEgOIAEgOQACgGABgCQACgBAJABIgDAMIADgEIADgDIAIgFIAJgEQAIgDAGAFQAFAFAAAHIgCAIIgCAHIgEALIgDAKIABAEIABAFIAFgBIAEgCIAHgIIAIgJIAHAGQgFAKgFAFQgGAIgJADQgKADgGgFQgHgFACgKIADgLIADgKIACgIIACgHQABgFgDgCQgCgCgEACQgKAFgFAHQgGAIgEAMQgEAIgDAOQgCAHgBACQgCABgJAAIAAgFQgMAJgHgBQgHAAgEgIIgJAGIgHAEIgGABIgGgBgAAEAKQgFABgFAFQgFAFgCAHQgCAGgBAIIABAFIAAAFQADAHAGACQAGABAEgFQAEgEABgDIAJgdIgBgEIgCgDQgEgEgFAAIgCAAgACqBKIgFAAIAOg9IgYACQAAgJACgCQACgCAIAAQALgBADgBQACgCADgKIALgwQADgJABgBQADgBAJABIgRBGIAvgDIACgCIABgDIAPg7QABgFACgCQADgCAEAAIAGAAIgKApIgXBfQgBAFgCACQgDACgFAAIgFAAIAOg9IgkADQgKABgCACQgCACgCAJIgFAUIgEAUQgBAFgDACQgCACgDAAIgCAAgAmrAYQgHAAABgIQAAgEADgDQADgEAEAAQAGAAABAHQAAAFgEAEQgCADgEAAIgBAAgAm5gFQABgFAEgDQADgDAEAAIAIADIADABQAGADACgCQACgBABgGIAIgBIAAAJQAAAEgDADQgDADgEAAQgEAAgEgBIgGgDQgEgBgCAAQgDABgBAEIgDACIgFADQgBgGABgEgAiiAEIALgNIAMgOQACgDAFACQAEABACADIAIAUQgIACgCgBQgCgBgCgGIgDgHIgGAGIgFAGQgFAFgHAAIgEAAg");
	this.shape_3.setTransform(73.1175,60.6714);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2}]}).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.Symbol14copy3, new cjs.Rectangle(0,0,146.3,76.3), null);


(lib.bgcopy = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.bg2();
	this.instance.setTransform(-384,-828,0.4021,0.4021);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.bgcopy, new cjs.Rectangle(-384,-828,308.9,549.3), null);


(lib.Symbol61 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.Tween18copy("synched",0);
	this.instance.setTransform(125.6,84.3);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1.0585,scaleY:1.0585},9).to({scaleX:1,scaleY:1},10).to({scaleX:1.0585,scaleY:1.0585},10).to({scaleX:1,scaleY:1},10).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(53.6,20.8,194.1,141.39999999999998);


(lib.Symbol56 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AujE1IgKgBIAAgCIAJgZIBMjkIAAgDIhQAAIAHgVIADgDIADAAIC3AAIAEAAIgJAXIAMABIgmBsIABABQADgCADgEIAGgFQAKgJAMgFQALgFANACQANADAHAJQAIALgEANIgFAQIgHAQIgIAVIgIAVQgBACABAEIADAFIAFADQAFAAABgCQALgEAJgJQAIgIAGgMIAEgJIACgMQAJgjAYgTQAQgMAQgCQASgCATAKIgDgaIAagGIADASIABARQAAAEgBADQgBADgCACQgGAFgBAIIABANQAAAEACABQABADAEAAQAKACAJgCQAJgDAJgFQAIgEADgIIAGgQQAFgOAGgDQAEgCARADIgIAYIAKgJIAJgJQAOgLATAAQAKgBAHAGQAHAEACALIABAJIAQgOQASgPAUAAQAQAAAJAJQAJALgDAOQgDAKgGAOIgJAYIgFANQgEAIgCAGIAAAHQACAFACABQACACAFAAQAFgBABgCQAHgFAIgIIAPgOIADgEIADgFIAQAPQgMASgKAKQgOAPgRAFQgWAGgMgMQgNgMAFgWIAIgTIAIgTQAEgJABgEIAGgPQADgKgGgFQgFgFgLAEQgJADgIAHQgGAFgHAKQgMAQgKAXQgGAPgJAcQgDAKgCABQgCACgKAAIgOAAIAMgiIAKggIAKgfIACgMQAAgHgHgEQgFgDgHABQgGACgFAEQgQAPgIANQgLAQgJAVQgHARgHAZQgCAGgCACQgDACgGgBIgIAAIgIAAIAXhIIgvAHIgFAMQgCAHgDAFQgPAdgYAKQgWAKgRgGQgRgHgNgXIgKAKIgMAKQgIAIgJACQgJADgKgCQgNgDgHgMQgFgMAFgQIAHgUIAKgUIAEgMQADgGABgGQABgDAAgEQgCgFgCgCQgCgCgEgBIgJABQgIACgIAGQgGAFgGAHQgQATgKAYQgKAUgIAcIgDAIIgaAAIBMjiIg0AAQgLAAgCACQgDACgDAKIhPDtQgCAFgCACQgCABgEAAIgLAAgApXCaQgGACgHAFIgFAGQgWAYgBAjQAAATALAHQAIAGAIgCQAIgBAIgHQANgMAHgQQAGgPABgTIAAgDIAAgCQgBgJgDgFQgDgHgIgEQgEgCgFAAIgFAAgAJpEYQgLgFgGgPIgLAJIgMAIQgXAJgRgLQgTgLgCgaQgFgyAeghQAGgHAIgGQAIgFAIgDQARgFANADQANAFALANIAPgrIgjAAIADgIIACgGIADgDIADgBIAYAAQAFAAABgCQADgBABgFIAJgaIACgDQABAAAAgBQABAAAAAAQABAAAAAAQABgBABAAIAKAAIAMAAIgOAnIAZAAIgDAIIgDAHQAAAAgBABQAAAAAAAAQgBABAAAAQgBABgBAAIgDAAQgPAAgDADQgDADgFAMQgOAvgUA2QgCAIAAAKQgBAIADADQAFADAGgEQAPgJAMgNQASgSAHgXQANgrAlgNQAZgKAVANQAUANABAbQAAAFACADQACACAGAAQAKACAJgDQAIgDAKgGQAHgFADgIIAFgPQAEgLAEgCQADgDAMABIAIAAIgIAaIAIgKIAJgHQAPgMATgBQAQgBAKAKQAKALgEAQQgBAJgGALIgHATQgDAEgCAIIgGALQgDAHAAAHQgBAIAEADQAFAEAGgFIAPgLIANgNIAGgGIAEgGQALAJABAAQADADAAACQAAADgDADIgHAKQgJAMgRAMQgJAGgMADQgTADgKgJQgKgJACgSQABgIADgLIAHgRIAHgQIAIgQQAFgOgHgHQgFgEgFAAQgFABgGAEQgIADgJAIQgGAGgHAJQgLATgLAWQgIAUgHAXQgBAFgDACQgCABgEAAIgJAAIgJAAIAWhHIgtAGIgFAMIgFAMQgOAdgbALQgWAKgUgJQgWgJgFgdIgGAHIgEAFIgQAOQgJAHgHAFQgJAFgIAAQgEAAgEgCgALtCbQgIACgGAIQgeAeAFAoQACAOALAFQALAFAMgGQAGgEAGgGQAKgMAGgPQAGgOAAgRQAAgKgDgFQgDgJgJgEQgFgDgFAAIgGABgAI0CnQgVAUgCAiQAAANAEAJQAEAIAIADQAIADAJgEQAIgEAIgJIAEgIQAQgmAFgQIAAgGIgDgHQgKgKgMAAQgPAAgLAMgAF0EUQgPgKAAgXIACgTIACgSIgtAHQgCADgDAKIgIANQgJAQgKAKQgOALgPAEQgUADgOgGQgMgHgMgTIgLAKQgGAHgFADQgIAGgKADQgOADgKgGQgKgGgDgNIAAgGIgLALIgMAKQgNAKgTgDQgLAAgFgGQgFgGgFgOIgKAIQgFAGgEACQgPALgPgBQgOAAgIgJQgIgIABgNQABgJAEgLIAHgTQACgHAGgKIAIgSQACgFAAgEQgBgGgEgDQgDgCgGAAQgGAAgDACQgOAHgJAKQgMAQgKAVIgQAoIgDANIgDAHQAAABAAABQgBAAAAABQAAAAgBABQAAAAAAAAQgBABgMAAIgOAAIAHgWQAGgNACgIQAEgJANgrIABgGIABgLQgBgFgFgCQgDgCgGABQgGAAgEACQgPAKgKANQgMARgKAXQgHARgIAaQgDAHgDADQgDADgIgBIgGAAIgHAAIACgIIAqh/IADgGQADgCAEAAIAJABIAJAAIgIAZIALgKQAGgGAFgDQAOgHAOgDQANgBAIAHQAHAFABAOIABAHIAGgHQADgFAEgBIAOgLIAPgGQAWgGANAMQAMANgHAWQgCAJgHANIgJAVIgEALIgEAMIAAAHQABAEACABQACADAEAAQAEAAABgCQAQgIAIgKQALgLAEgPIAYhGIAEgCQACgDADAAIALAAIAKAAIgLAfQgHARgDAMQgHAVgCAWQAAAMAHAEQAIAFAIgHQAIgFAFgGQAHgHADgHIASgpIAQgoIAEgJQACgCAIgBIgFgVIAcgFIABASIACARQAAAHgEAGIgKAKQgGAEgCAFIgTA/IAAAJQABAFADACQADACAEgBQAFgBADgCQAHgFAHgJIAPgOQAAAAAAAAQABgBAAAAQAAgBAAgBQABAAAAgBIABgFQADggATgYQAhgpAzAWIgEgbIAagFIACASIACAQIgBAHIgDAGQgHAGAAAIQAAAFADAJIABADIACACQAQAGAQgKQAQgIAEgSIgSAAIADgKIADgJIADgDIAGgBQAHACAEgEQAEgDACgHQACgHAFgKIAGgSQABgDADgCQABgBAEAAIAJAAIAMAAIgUA1IAhAAIgDALIgEAJQgBACgEABIgBAAIgDAAIgOAAQgHAAgEACQgEACgBAIIgEANQgHAWgEAWQgCAIABAIQACAJAFADQAHAEAIgFQAJgFAJgJQAGgFAIgLIAEgHIAQAPQgLASgKAJQgNANgOAGQgLAEgJAAQgKAAgHgFgAD6ChIgIAJQgSAWgDAiQABAKACAFQAEAIAHAEQAJAFAHgDQAIgCAGgGQAPgPAGgRQAHgSgCgTQgCgRgNgFIgIgBQgJAAgJAGgASFEQQgJgHABgNQABgPAHgUIAJgSIAIgRIAEgMQABgIgGgEQgFgEgIABIgMAGQgXAPgOAeIgNAfIgMAiIgDAFQgCACgEgBIgJAAIgMAAIAJgbIBCjBIADgGQADgCAEAAIAJABIAKAAIgmBsIAKgKIAKgHQATgJANgBQARgCAJAMQAKAMgFASIgHATIgHASIgIAPIgGAPQgBAEABAEQABAFADACQABACAGAAIAHgDQAIgFAKgKQAVgWAKggQAGgUAUgRQAVgSAcAEQARACAJARQAKAQgGASQgKAfglAKIgSACIgUABQACARAOAGQAOAHARgEQANgDAMgIQALgIALgMIAOARQgXAggiAGQgRACgSgCQgPgDgJgIQgKgJgJgTIgLAMIgKALQgJAIgIAFQgLAEgLAAQgMAAgIgIgAURCdQgOAIgJANQgHALgDAQQAJADAJAAQAHgBAJgDQAPgFAIgOQAEgGgBgIQAAgIgEgEQgEgFgGAAQgGAAgHADgAL2B0IAIgLIAegsQAAAAAAgBQABAAAAAAQAAgBABAAQAAgBABAAIAGgCIALABIAMABIgPASIgNAOIgLAPQgFAIgIADIgIABIgKgBgAUhB0IgJg9IAbgBIAAA+gAEABqIAOgXQAKgNAFgKIAJgLQAIgDAIACIAHABIAIAAIgHAIIglAsQgFAGgGABIgCABQgFAAgHgDgAzJAqIACgJIBKjcQABgFADgBQACgCAGAAIAIAAIAJAAIgIAVIABABIADgEIAEgDIAOgKQAIgFAHgCQAPgEAMAGQALAHAFAPQAHAVgIAXQgKAhgaAYQASgDAOgLQAMgJAMgPQAIgLAGgRQAEgNAGgJQAGgMAJgIQATgSAVgBQAUAAAVASQABgNAKgBIAKAAIAKAAIgFANIgaBSQgDAHAAAIQAAAHADACQADACAHgCQAIgEAGgGIANgNIAMgOIAPAOQgKASgLAJQgMAOgQAGQgPAFgLgFQgKgEgGgPQgLANgMAFQgMAFgNgCQgNgDgJgKQgKgKgDgPQgfAhglAFQgjAEgrgSIgeBcQgDAKgBACQgDACgJAAgAxVioQgIAGgHAIQgKAOgIAQQgGAOgGASQgBABAAAAQAAABAAAAQAAABAAABQAAAAABABIACADQAHAJANACQANABAKgHQARgNAKgSQAIgSACgWIgDgNQgCgHgHgEQgEgBgEAAQgIAAgJAHgAvIilQgMALgGAPQgGANgBAUIABAHIABAHQAFANAKADQALADAKgIQAJgIAFgKQAIgRAMggQADgJgEgGQgDgHgKgDQgFgBgFAAQgMAAgLAJgAlCgRQgggDgWgSQgQgOgIgYIAAgFQABgDADgBIAKgFIAKgEQAPAhASAMQASALAbgGQAVgEAMgOQANgOABgVQAAgZgPgOQgOgNgpgLIAAgCQADgOADgCQADgCAPgCQARAAAOgFQAQgFANgKQAWgSgCgcQgCgSgNgKQgOgJgTACQgOADgNAJQgKAHgJANIgGAIIgVgMQAIgVAYgPQAXgQAXgBQAQgBAMAEQANAEALAKQATATgBAeQgCAegVAUQgVATgiAGIACACIACAAQApAWAAAsQABAYgLARQgKARgVAMQgWAMgaAAIgKAAgA0ugXQgbgLgLgbQgMgaAKgdIAIgSIAJgRIAaAPIgHAKQgPAVAEAXQAFAWAVALQAOAHAQgCQAQgBANgJQAOgJAIgNQAIgPgCgQQAAgVgTgOIgSgPIgTgPQgTgPgHgSQgIgTAGgXQAHgXAQgPQAPgPAYgGQApgKAbAZQANANAFAVQAEAVgJASIgDACIgDACIgMABIgMAAIADgNQAFgSgFgOQgEgOgNgIQgOgGgSAEQgRAFgLANQgNAQACATQABATAPAPIASAOIAKAHIAJAHQAfAZACAiQACAigbAcQgTAUgdAGQgLADgLAAQgRAAgQgGgArzgzQgMgDgHgJQgHgIgDgNQgIgaALgfQALgfAWgPQAOgKAQgBQASgCALAIIAHAFQABADAFADIAdhWQAEgKACgBQADgCAJAAIAOAAIgEALIg2CdQgEAKgCARQAAAHADADQAEACAGgDQANgGAJgKQALgMAHgKQAJgOAEgNQAGgTAPgRQASgUAWgBQAVgBAVARIADgHQACgEACgBIAMgBIAMAAIgJAbIgJAbIgOAvQgBAEAAAGQAAAGADACQADACAFgBQALgFAGgGIAMgNIAMgOIAPAOQgKAQgJAKQgNANgPAGQgQAHgLgFQgKgEgIgQQgUAbgcgGQgPgDgIgLQgHgJgEgRIgKAMIgKAKQgLALgMAEQgOAHgLgFQgKgEgGgQIgGAHQgJAKgMADQgHADgHAAIgLgCgAotisIgJAEQgPAKgIAYQgIAYAFARQAFAOAMADQALADALgJQAKgKAFgLQAEgIAFgPIAJgXQAFgMgNgIIgIgEIgJgEIgMAFgArVirQgHADgDADQgQANgFASQgGASADAUQABAPAOAFQAMADAMgKQAJgHAEgJIAJgZIAKgZQAGgMgNgHQgDgDgFgCIgLgEIgLAGgAhbg6QgXgPADgfQADgYAIgXIAVg8IAWg+QABgEADgCQACgBAEAAIAJAAIALAAIgnBkIAJgHQANgIALgDQAMgDANAGQALAFAFAMQAFAJAAAPQABAJACABQACACAIAAIANAAQAGgBADgDQAEgDACgGIAGgRIAHgRQABgEACgBIAGgBIAKAAIALAAIgFALQgLAZgEAOQgIAWgDATIAAAOQACAKAGAEQAHADAIgFQAGgDAFgFQAFgFADgFQAIgOAIgSIANggQAFgLADgLQACgIADgDQAEgEAKADIgEgdIAZgEIADAQIABAQQAAAOgPAKQgGAEgCAFIgVA/IAAAMQAAAIADADQAFADAGgDQAQgJAIgIQALgLADgQQAFgnAbgYQAOgMASgDQAWgDARALQAFgHgBgJIgEgRIAYgEQAJAXgDANQgCALgOAJIADAXQAAABAAAAQABABAAAAQAAAAABABQAAAAABAAQAAABAAAAQAAAAABABQAAAAABAAQAAAAABAAQAMAEANgEQAMgFAGgMQAPgZAWgJQAcgMAUAQQALAIADANQADAKgCAPQgBAGgDACQgCACgGAAIgIAAIgIAAIABgLIAAgKQAAgOgKgFQgKgFgLAIQgLAHgIANQgFAKgDAPQgDANACAKQADASAMAHQAOAIARgFQAKgDAKgHQAJgGAJgKIAEgFIACABQALAMAAAFQAAAFgNAKQgaAWggABQgaABgRgSQgQgRABgbIABgLIgnADQgJAggUAUQgRAPgWACQgiACgOghIgIAIQgFAGgEACQgOAKgKADQgOAFgKgHQgJgGgDgPIgBgGIgHAJQgFAGgEACIgNAJIgPAFQgSACgKgMQgKgLABgWIACgOIACgOIghAAIgGAOIgGANQgOAZgWAMQgOAHgNAAQgOAAgMgIgAD7iqQgFAEgEAFQgTAWgCAgQAAALACAHQADAIAJAFQAIADAJgCQAHgCAHgHQAegfgGgnQgCgQgMgEQgEgCgEAAQgIAAgJAGgAgoiuQgFACgFADQgRAJgKAYQgLAZAEASQACAMAJAEQAIAEAJgDQAIgDAHgFQANgMAIgRQAHgPABgQQAAgPgEgIQgFgIgJAAIgKABgAD/jmIAlg4IADgCIADAAIAMAAIANABIgqAzQgGAIgGABIgDAAQgEAAgHgDg");
	mask.setTransform(137.18,30.9571);

	// Layer_2
	this.instance = new lib.Tween20();
	this.instance.setTransform(-49,30.75,1.4876,1.4876,0,0,0,0.1,0.1);
	this.instance.compositeOperation = "overlay";

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:308.65},39,cjs.Ease.circOut).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,274.4,61.9);


(lib.Symbol55 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_2 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AiXJ5QACABgGv5QABgVARgDICMgcIAAgHIgXAAIAAh4QACgMAWADIAAgxIAQAAIAAg/QgsgKg1AGIhmAVIgSgaIAVgJICKgXQA6AOBIAAIBZgGIAQAGIAAANIgIAFIggAFIAABBQAQgBgDAMIAAAnQAVgCgCAQIAAB1IgLAAIAMANIB0AWQAdACAAAcIAAQJQgBBChngBIkpADQhbgFAGhXgAsiIiIgjlrQgBgeAogHQAIgTAfgJIBngQQATgCAGAPQCtgYCsgEIALALQATAEgDATIAmFqQACAegvANQjYAxkFAHIgMAAQgoAAgHgkgALXI3IkNgiQgigLALgtIA0nrIAGgVIABgMIAViNQAciYCXAAQBDAKAlArQAlAsADBNIhLKvQgCAUgKAOQgJAMgOAAIgBAAg");
	mask.setTransform(83.7732,72.7);

	// Layer_2
	this.instance = new lib.Tween20();
	this.instance.setTransform(-42.55,86.3,1.5934,2.9416,-4.4658);
	this.instance.compositeOperation = "overlay";

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1.5561,scaleY:2.9417,rotation:5.6991,x:209.7},39,cjs.Ease.circOut).wait(1));

	// Layer_1
	this.instance_1 = new lib.cumsp();
	this.instance_1.setTransform(0,0,0.2219,0.2219);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(40));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,187.1,147.6);


(lib.Symbol53 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Symbol_55
	this.instance = new lib.Symbol55();
	this.instance.setTransform(93.5,73.8,1,1,0,0,0,93.5,73.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:76.3},12).to({y:73.8},12).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-76.9,-15,264,205.2);


(lib.Symbol52 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AprDPIgHAAIAAgBIAGgRIAziZIAAgCIg2AAIAFgOIACgCIACAAIB6AAIADAAIgGAQIAIAAIgZBJIABAAIADgEIAEgDQAHgGAIgDQAIgEAIACQAJABAFAHQAFAHgCAIIgEALIgEALIgGAOIgFAOQgBAAAAABQAAAAAAABQAAAAAAABQAAAAABABIABAEIAEABIAEgBQAIgDAGgGQAFgFAEgIIACgGIACgIQAGgYAQgMQALgIALgBQAMgCAMAHIgCgSIASgDIABAMIABALIgBAFIgCADQgEADAAAFIABAJIABAEQAAAAAAAAQABABAAAAQAAAAABAAQABAAAAABQAHABAGgCIAMgFQAFgDADgFIAEgKQADgKADgCQADgBAMACIgGAQIAHgGIAGgGQAKgHAMgBQAHAAAFAEQAFADABAHIABAGIAKgJQAMgKAOgBQALAAAGAHQAGAHgDAJIgFAQIgHAQIgDAJIgEAJIAAAFIADAEQAAAAAAAAQABABAAAAQABAAABAAQAAAAABAAIAFgBIAKgJIAJgKIACgCIACgEIALALQgIAMgHAGQgJAKgLADQgPAEgIgIQgJgIAEgOIAFgNIAFgNIAEgJIAEgJQACgHgEgDQgEgEgHADQgGACgGAEQgEAEgEAGQgIALgHAQIgKAcQgCAHgBABQgBABgHAAIgKAAIAIgXIAHgVIAHgVIABgIQAAgEgEgDQgEgCgFABQgDABgEADQgLAJgFAJQgIALgFAOQgFAMgFAQIgDAFQgCACgEgBIgFAAIgGAAIAQgwIgfAFIgEAIIgDAIQgKATgQAHQgPAGgLgEQgMgEgIgPIgHAGIgIAHQgFAFgGABQgHACgGgBQgJgCgFgIQgDgIADgKIAFgOIAGgOIADgHIADgIQABgCgBgDIgCgFIgEgCIgGABQgGABgFAEIgIAIQgKANgHAQQgHAOgFASIgCAFIgSAAIAziXIgjAAQgHAAgBABQgCACgDAGIg0CfQgBAEgCABIgEABIgHgBgAmNBoQgEABgEAEIgEADQgPAQAAAYQAAANAHAFQAFADAGgBQAFAAAGgFQAIgIAFgLQAEgKABgNIAAgCIAAgBQgBgGgCgEQgCgEgGgDIgGgBIgDAAgAGhC8QgHgDgEgKIgHAGIgIAFQgPAGgMgHQgNgIgBgRQgEghAUgWIAKgJQAFgDAGgCQALgEAJACQAJADAHAJIAKgcIgYAAIACgGIACgEIACgCIACgBIAQAAQABAAAAAAQABAAABAAQAAAAAAgBQABAAAAAAIADgEIAGgSIABgCIADgBIAHAAIAIAAIgJAaIAQAAIgCAGIgCAEIgCACIgDABQgJAAgCABQgCACgDAJIgXBDQgCAFAAAHQAAAFACACQADACAEgCQAKgGAIgJQAMgMAFgPQAIgdAZgJQARgGAOAIQANAJABASQAAADACACIAFACQAHABAGgCIAMgGQAEgDADgGIADgKQADgHACgCQACgBAIAAIAGAAIgGASIAGgHIAFgFQALgIAMgBQALAAAHAHQAGAHgCALQgBAFgEAIIgFANIgDAIIgEAHIgCAJQgBAGADACQADACAFgDIAJgHIAJgJIAEgEIADgEIAIAGIACAEIgCAEIgFAGQgGAIgLAIQgGAEgIACQgNACgHgGQgHgGACgMQAAgFADgHIAEgMIAFgLIAFgLQAEgJgFgEQgDgDgEAAIgHADQgGACgFAGIgJAKIgPAbQgFANgFAQIgCAEIgEABIgGAAIgHAAIAPgvIgeAEIgEAIIgDAIQgKATgRAHQgPAHgOgGQgOgGgEgTIgDAEIgDAEIgLAJIgLAIQgGADgFAAIgGgBgAH6BpQgFABgFAFQgUAUAEAbQABAJAHAEQAIADAIgEQAEgCAEgFQAHgIAEgKQADgJABgMQgBgGgBgEQgCgFgGgDQgEgCgDAAIgEABgAF+BwQgOAOgBAXQgBAIAEAGQACAGAGACQAFACAGgDQAFgDAFgGIADgFIAOgkIAAgEIgCgFQgGgGgJAAQgJAAgIAHgAD9C5QgKgGABgPIABgNIABgMIgeAEIgEAJIgFAJQgGALgHAGQgJAHgKADQgOACgJgEQgIgFgIgMIgHAGQgEAFgEACQgFAEgHACQgJACgHgEQgGgEgCgJIgBgEIgHAIIgIAGQgIAHgNgCQgHAAgEgEQgDgEgEgJIgHAFQgDAEgDABQgKAIgJgBQgKAAgFgGQgGgFABgJIAEgNIAEgNIAGgMIAFgLIABgHQAAgDgDgCQgCgCgEAAQgEAAgCACQgJAEgGAHQgJAKgGAPIgLAbIgCAIIgCAFIgBACIgJABIgJAAIAFgPIAFgOIALgjIABgEIABgHQgBgDgDgBQgDgCgEABQgEAAgCABQgKAHgHAIQgIAMgHAPQgFAMgFARQgBAFgDACQgCACgFgBIgEAAIgFAAIABgFIAchVIADgEIAEgBIAGAAIAGAAIgFARIAHgHIAIgGQAJgFAKgBQAIgBAFAEQAFAEABAJIAAAFIAFgFQACgDACgBIAKgHIAKgEQAOgEAIAIQAJAJgFAOQgBAGgFAJIgGAOIgCAHIgDAIIAAAFQAAABAAAAQABABAAAAQAAABAAAAQABAAAAABQAAAAABAAQAAAAAAABQAAAAABAAQAAAAABAAIAEgBQAKgFAGgHQAHgHADgKIARgvIACgCIADgBIAIgBIAHABIgIAUQgFALgCAIQgEAPgBAPQgBAHAFADQAFADAGgEQAFgDAEgFQAEgEACgFIAMgbIALgbIADgGIAGgCIgDgOIATgDIABAMIABALQAAAFgDAEIgGAGQgFADgBADIgNArIAAAGIADAEQACABADAAQADgBACgBQAFgEAFgFIAJgKIACgDIAAgDQACgWANgPQAWgcAiAPIgCgSIARgDIACALIABALIgBAFIgCAEQgEAEAAAFIABAKIABABIACACQAKAEALgHQALgFADgMIgNAAIACgHIADgGIACgCIADAAQAFABADgDQADgCABgFIAEgLIAEgMIADgDQAAgBAAAAQABAAAAAAQAAAAABAAQABAAAAAAIAHAAIAHAAIgNAjIAWAAIgCAIIgCAGIgEACIgBAAIgCAAIgJAAQgFAAgCABQgDACgBAFIgCAIQgFAPgCAPQgCAFABAGQABAGAEACQAEACAFgDQAHgDAFgGIAKgLIADgFIAKALQgHALgHAHQgIAIgKAEQgHADgGAAQgHAAgFgEgACrBtIgFAFQgMAPgCAXQABAHABADQADAGAFACQAFADAFgBQAGgCAEgEQAKgKAEgLQAEgMgBgNQgBgLgJgEIgFgBQgGAAgHAFgAMLC3QgFgFAAgJQABgKAFgNIAFgMIAGgLIACgJQABgFgEgCQgDgDgGABIgHAEQgQAJgJAVIgJAVIgIAWIgCADQgBAAAAABQAAAAgBAAQAAAAgBAAQgBAAAAAAIgGAAIgIAAIAGgSIAsiBIACgEIAFgBIAGAAIAHAAIgaBJIAHgHIAGgFQANgGAJgBQALgBAGAIQAHAIgEAMIgEANIgFAMIgFAKIgEAKIAAAGQAAADACABQAAAAABAAQAAABABAAQAAAAA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IAHAAIAHAAIgDAHIgKAbQgFAPgCANIAAAJQABAHAEACQAEADAGgEQAEgCADgDIAGgHIAKgVIAJgWQAEgHACgIQABgGACgBQADgDAGACIgCgUIARgDIABALIABALQAAAKgKAGQgEADgBAEIgOAqIgBAIQAAAFADACQADADAEgDQALgGAFgFQAIgIABgKQAEgaASgRQAKgIAMgCQAOgCAMAIQADgFAAgGIgDgMIAQgDQAGAQgCAJQgBAIgJAGIACAPIABACIACABQAJADAIgDQAIgDAFgIQAKgRAOgGQATgIAOALQAHAFACAJQACAHgBAKQgBAEgCABQgBACgEgBIgGAAIgFAAIAAgHIABgHQgBgJgGgDQgHgEgHAFQgIAFgFAJQgDAHgCAKQgCAIABAHQACAMAIAFQAJAGAMgEQAHgCAGgFQAGgEAGgGIADgEIABABQAIAIAAADQAAAEgJAHQgSAOgVABQgSAAgLgMQgLgLABgSIABgHIgaABQgHAWgNANQgMALgPABQgWABgKgWIgFAGIgGAFQgKAHgGACQgKADgGgFQgHgEgCgKIAAgEIgFAGIgGAGIgJAFIgKAEQgMABgHgIQgHgHABgPIABgJIACgKIgXAAIgEAJIgDAJQgKARgOAIQgKAFgJAAQgJAAgIgFgACqhxIgGAGQgNAPgBAWQAAAHABAFQACAFAGADQAGADAFgCQAFgBAFgFQAUgVgEgaQgBgLgIgDIgGgBQgFAAgGAEgAgahzIgHADQgLAGgHAQQgHARADAMQABAIAGADQAFADAHgDQAFgCAEgDQAJgIAGgLQAEgKABgLQAAgKgDgGQgDgFgGAAIgHABgACtiZIAYgmIACgBIACgBIAJABIAJAAIgdAjQgEAFgEAAIgCAAIgHgBg");
	mask.setTransform(92.3367,20.7479);

	// Layer_2
	this.instance = new lib.Tween20();
	this.instance.setTransform(-32.6,20.65);
	this.instance.compositeOperation = "overlay";

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:207.8},39,cjs.Ease.circOut).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,184.7,41.5);


(lib.Symbol47 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Symbol_51
	this.instance = new lib.Symbol51();
	this.instance.setTransform(13.7,10.8,1,1,0,0,0,13.7,10.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1.044,scaleY:1.044},6).to({scaleX:1,scaleY:1},7).to({scaleX:1.044,scaleY:1.044},6).to({scaleX:1,scaleY:1},6).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-138.7,-2.5,199.89999999999998,51.2);


(lib.Symbol46 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Symbol_50
	this.instance = new lib.Symbol50();
	this.instance.setTransform(8.8,9.2,1,1,0,0,0,8.8,9.2);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1.1196,scaleY:1.1196},6).to({scaleX:1,scaleY:1},7).to({scaleX:1.1196,scaleY:1.1196},6).to({scaleX:1,scaleY:1},6).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-14.9,-33.9,214.4,54.9);


(lib.Symbol43 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.Tween18("synched",0);
	this.instance.setTransform(98.6,88.2);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:87.4},19).to({y:88.2},20).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-0.8,197.3,177.3);


(lib.Symbol4 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_3
	this.instance = new lib.Symbol29();
	this.instance.setTransform(962.4,48.1,1.0088,1.0088,0,0,0,763.6,103.4);
	this.instance.filters = [new cjs.ColorMatrixFilter(new cjs.ColorMatrix(0, 20, 10, 0))];
	this.instance.cache(-2,-2,1546,223);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(192.1,-56.2,1559,225);


(lib.Symbol1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.uptofsize();
	this.instance.setTransform(-0.25,1.85);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:0.25},6).to({y:1.85},6).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12.2,-13.8,27,28.1);


(lib.pull = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Symbol_57
	this.instance = new lib.Symbol57();
	this.instance.setTransform(-78.3,10.25,0.943,0.943,0,0,0,56.2,5.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// pull
	this.instance_1 = new lib.Symbol1();
	this.instance_1.setTransform(1.55,-2,0.88,0.88,0,0,0,1.5,1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.pull, new cjs.Rectangle(-131.3,-13.4,144.10000000000002,28.4), null);


(lib.full_size = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// bg_jpg
	this.instance = new lib.bgcopy();
	this.instance.setTransform(963.5,1710.8,2.5083,2.5083,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.full_size, new cjs.Rectangle(0.1,-366.3,774.6999999999999,1377.7), null);


(lib.Symbol20copy2 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Symbol_26
	this.instance = new lib.Symbol26copy2();
	this.instance.setTransform(29.4,30,1,1,0,0,0,29.4,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:31.5},14).to({y:30},15).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(5,3,47.2,56.3);


(lib.Symbol15copy5 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.Tween13("synched",0);
	this.instance.setTransform(119.05,32.3);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1.0349,scaleY:1.0349},6).to({scaleX:1,scaleY:1},6).to({scaleX:1.0349,scaleY:1.0349},6).to({scaleX:1,scaleY:1},6).wait(16));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.1,-1.1,246.4,66.89999999999999);


(lib.Symbol14copy4 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Symbol_18
	this.instance = new lib.Symbol18copy();
	this.instance.setTransform(26.2,30.2,1,1,0,0,0,26.2,30.2);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:32.35},14).to({y:30.2},15).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(5,5,34.7,55.7);


(lib.car1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Symbol_56
	this.instance = new lib.Symbol56();
	this.instance.setTransform(358,55.7,1,1,0,0,0,137.2,30.9);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// Layer_2
	this.instance_1 = new lib.Symbol15copy5();
	this.instance_1.setTransform(335.75,290,0.5107,0.5107,0,0,0,119.4,32.6);

	this.instance_2 = new lib.Symbol14copy4();
	this.instance_2.setTransform(445.2,112.65,0.9918,0.9918,0,0,0,19.1,19.6);

	this.instance_3 = new lib.Symbol20copy2();
	this.instance_3.setTransform(392.75,125.85,0.9752,0.9752,0,0,0,29.8,30.2);

	this.instance_4 = new lib.Symbol61();
	this.instance_4.setTransform(307.3,125.2,0.3841,0.3841,5.714,0,0,126.7,85);

	this.instance_5 = new lib.Symbol46();
	this.instance_5.setTransform(247.1,76.75,1.4867,1.4867,0,0,0,8.9,9.2);

	this.instance_6 = new lib.Symbol47();
	this.instance_6.setTransform(432.45,38.4,1.4867,1.4867,0,0,0,13.7,10.8);

	this.instance_7 = new lib.Symbol48();
	this.instance_7.setTransform(381.5,75.5,1.4867,1.4867,0,0,0,85.2,15.2);

	this.instance_8 = new lib.Symbol49();
	this.instance_8.setTransform(312,41.15,1.4867,1.4867,0,0,0,67,18.4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_8},{t:this.instance_7},{t:this.instance_6},{t:this.instance_5},{t:this.instance_4},{t:this.instance_3},{t:this.instance_2},{t:this.instance_1}]}).wait(1));

	// BG
	this.instance_9 = new lib.card1();
	this.instance_9.setTransform(0,0,0.5583,0.5582);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.car1, new cjs.Rectangle(0,0,670,322.6), null);


(lib.Symbol58 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// BBMATONG
	this.instance = new lib.Symbol14copy4();
	this.instance.setTransform(191.05,79.7,0.1799,0.1799,0,0,0,19.8,20);
	this.instance.alpha = 0;
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(6).to({_off:false},0).to({regX:19,regY:19.4,scaleX:0.6956,scaleY:0.6956,x:192.9,y:57.4,alpha:1},9,cjs.Ease.backOut).wait(9));

	// BBHQM
	this.instance_1 = new lib.Symbol20copy2();
	this.instance_1.setTransform(149.8,48.55,0.1799,0.1799,0,0,0,30.3,30.9);
	this.instance_1.alpha = 0;
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(3).to({_off:false},0).to({regX:29.7,regY:30.1,scaleX:0.6956,scaleY:0.6956,x:145.75,y:65.2,alpha:1},9,cjs.Ease.backOut).wait(12));

	// _100
	this.instance_2 = new lib.Symbol61();
	this.instance_2.setTransform(75.35,58.45,0.0914,0.0914,5.7125,0,0,127.5,86.8);
	this.instance_2.alpha = 0;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regX:126.5,regY:84.9,scaleX:0.2812,scaleY:0.2812,rotation:5.7143,x:74.75,y:64.4,alpha:1},9,cjs.Ease.backOut).wait(15));

	// TIMTRAI
	this.instance_3 = new lib.Symbol46();
	this.instance_3.setTransform(90.85,26.4,1,1,0,0,0,8.8,9.2);
	this.instance_3.alpha = 0;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({x:37.35,y:38.5,alpha:1},9,cjs.Ease.backOut).wait(15));

	// TIMPHAI
	this.instance_4 = new lib.Symbol47();
	this.instance_4.setTransform(104.6,26.35,1,1,0,0,0,13.7,10.8);
	this.instance_4.alpha = 0;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({x:162.15,y:12.75,alpha:1},9,cjs.Ease.backOut).wait(15));

	// Layer_1
	this.instance_5 = new lib.Symbol52();
	this.instance_5.setTransform(112,24.35,1,1,0,0,0,92.3,20.8);
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(9).to({_off:false},0).wait(15));

	// TMDH
	this.instance_6 = new lib.Symbol48();
	this.instance_6.setTransform(138.65,37.7,1,1,0,0,0,85.2,15.2);
	this.instance_6.alpha = 0;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({x:127.85,alpha:1},9,cjs.Ease.backOut).wait(15));

	// SD3B
	this.instance_7 = new lib.Symbol49();
	this.instance_7.setTransform(64.95,14.6,1,1,0,0,0,67,18.4);
	this.instance_7.alpha = 0;

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({x:81.1,alpha:1},9,cjs.Ease.backOut).wait(15));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-41.4,-12.1,302.59999999999997,101.69999999999999);


(lib.Symbol54 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.Symbol53();
	this.instance.setTransform(236.25,185.85,2.5214,2.5214,0,0,0,93.7,73.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:183.3},12).to({y:185.85},12).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-193.9,-40.5,665.7,513.6);


(lib.Symbol16 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// timeline functions:
	this.frame_23 = function() {
		this.stop();
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).wait(23).call(this.frame_23).wait(1));

	// LOGO
	this.instance = new lib.LOGO();
	this.instance.setTransform(396,89,0.1392,0.1392);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(24));

	// TEXT
	this.instance_1 = new lib.Symbol58("synched",0);
	this.instance_1.setTransform(321.2,146.8,1,1,0,0,0,109.2,44.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(24));

	// SIGNATURE
	this.instance_2 = new lib.Symbol14copy3();
	this.instance_2.setTransform(84.6,173.45,0.3273,0.3273,0,0,0,73.3,38.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(24));

	// LIGHTCUASO
	this.instance_3 = new lib.Symbol44();
	this.instance_3.setTransform(152.55,230.25,0.8731,0.8731,0,0,0,174.7,170.6);
	this.instance_3.compositeOperation = "screen";

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(24));

	// CUMSP
	this.instance_4 = new lib.Symbol53();
	this.instance_4.setTransform(362.65,268.75,0.6927,0.6927,0,0,0,93.5,73.8);
	this.instance_4.alpha = 0.6992;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({scaleX:1,scaleY:1,x:362.5,y:261.8,alpha:1},9,cjs.Ease.backOut).wait(15));

	// Layer_9 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	var mask_graphics_0 = new cjs.Graphics().p("AhQIcQgigiAAgvQAAgwAigiQAhgiAvAAQAwAAAhAiQAiAiAAAwQAAAvgiAiQghAigwAAQgvAAghgig");
	var mask_graphics_1 = new cjs.Graphics().p("AqkPCQkZkZAAmNQAAmLEZkZQEYkYGMAAQGNAAEYEYQEZEZAAGLQAAGNkZEZQkYEYmNAAQmMAAkYkYg");
	var mask_graphics_2 = new cjs.Graphics().p("AuCReQl0l0AAoOQAAoOF0l0QF0l0IOAAQIPAAF0F0QF0F0AAIOQAAIOl0F0Ql0F1oPAAQoOAAl0l1g");
	var mask_graphics_3 = new cjs.Graphics().p("AwaTKQmzmzAApoQAApmGzm0QGzmzJnAAQJoAAGyGzQG0G0AAJmQAAJom0GzQmyGzpoAAQpnAAmzmzg");
	var mask_graphics_4 = new cjs.Graphics().p("AyKUZQnhnhAAqqQAAqoHhnhQHhniKpAAQKpAAHhHiQHiHhAAKoQAAKqniHhQnhHhqpAAQqpAAnhnhg");
	var mask_graphics_5 = new cjs.Graphics().p("AzdVUQoEoEAAraQAArZIEoFQIDoELaAAQLaAAIEIEQIEIFAALZQAALaoEIEQoEIEraAAQraAAoDoEg");
	var mask_graphics_6 = new cjs.Graphics().p("A0bWAQodoeAAr+QAAr9IdoeQIeodL9AAQL+AAIdIdQIeIeAAL9QAAL+oeIeQodIdr+AAQr9AAoeodg");
	var mask_graphics_7 = new cjs.Graphics().p("A1EWdQovouAAsXQAAsWIvovQIuouMWAAQMWAAIvIuQIvIvAAMWQAAMXovIuQovIvsWAAQsWAAouovg");
	var mask_graphics_8 = new cjs.Graphics().p("A1dWvQo5o5AAslQAAskI5o5QI5o5MkAAQMlAAI4I5QI6I5AAMkQAAMlo6I5Qo4I4slAAQskAAo5o4g");
	var mask_graphics_9 = new cjs.Graphics().p("A1lVmQo8o8AAsqQAAspI8o8QI8o8MpAAQMpAAI9I8QI8I8AAMpQAAMqo8I8Qo9I8spAAQspAAo8o8g");

	this.timeline.addTween(cjs.Tween.get(mask).to({graphics:mask_graphics_0,x:8.25,y:57.3839}).wait(1).to({graphics:mask_graphics_1,x:59.4681,y:124.197}).wait(1).to({graphics:mask_graphics_2,x:78.5207,y:149.0508}).wait(1).to({graphics:mask_graphics_3,x:91.5808,y:166.0874}).wait(1).to({graphics:mask_graphics_4,x:101.2094,y:178.6478}).wait(1).to({graphics:mask_graphics_5,x:108.4012,y:188.0293}).wait(1).to({graphics:mask_graphics_6,x:113.6561,y:194.8842}).wait(1).to({graphics:mask_graphics_7,x:117.2546,y:199.5784}).wait(1).to({graphics:mask_graphics_8,x:119.3577,y:202.322}).wait(1).to({graphics:mask_graphics_9,x:120.2,y:211.6}).wait(15));

	// BLING
	this.instance_5 = new lib.Symbol43();
	this.instance_5.setTransform(226.6,269.2,1,1,0,0,0,98.6,88.2);
	this.instance_5.compositeOperation = "screen";

	var maskedShapeInstanceList = [this.instance_5];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(24));

	// Layer_5
	this.instance_6 = new lib.TL();
	this.instance_6.setTransform(58,138,0.4271,0.4271);

	var maskedShapeInstanceList = [this.instance_6];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(24));

	// BG
	this.instance_7 = new lib.Symbol42();
	this.instance_7.setTransform(256,213.15,0.998,0.998,0,0,0,255.1,131.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(24));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,74.6,510.6,331.70000000000005);


(lib.c3 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// timeline functions:
	this.frame_39 = function() {
		this.stop();
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).wait(39).call(this.frame_39).wait(1));

	// Layer_5 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AhYR5QgMgCg4gOQh3gdh4ADIg+ADQgkAAgZgGQghgHgYgSQgbgTgKgcQgEgKgEgXQgDgXgFgLQgEgMgLgQIgTgaQgUgigGgyQgEggABg7QAFjmAKhzQAHhgAPhlIAOhiQAIg4ACgpQABgXgChfQgBhIAGgtQAJhGAhhWQAPglA0hwQBXi6BIjEQAchOAWglQAjg8AxgYQAigRAxgEQAYgBBAACQBbADC7gBQCiAHBsApQBzAtAtBPQAiA6ADBiQADBjgfBBQgiBGhaA9QhuBAgzAjQgmAagWAYQgpAugRBJQgNA4gBBRQAABRAGChQACCOgVBhQgTBXgvBoIgUAtQgLAagFAVQgIAkADBJQACA+gBAiQgBA1gGArQgMBLgdAvQgTAcgZAUQgbAUgeAHQgOADgQAAQgRAAgUgEg");
	mask.setTransform(542.4221,197.9369);

	// Layer_4
	this.instance = new lib.Symbol54();
	this.instance.setTransform(340.5,212.4,0.76,0.76,0,0,0,139.1,217.6);

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(40));

	// bg3
	this.instance_1 = new lib.car1();
	this.instance_1.setTransform(334.9,164.2,1,1,0,0,0,334.9,164.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(40));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,670,322.8);


(lib.c2 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// timeline functions:
	this.frame_39 = function() {
		this.stop();
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).wait(39).call(this.frame_39).wait(1));

	// Layer_6 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AkYSnQhRgTgjgjQghghgGgzQgHgxAUgtIAGgOQgUgkgBg+QgBg0AMhtQAMhrgCg3QgBgmgJhJQgKhKgBglIAAgcIgFgJQgMgVgEgdQgDgTgBgiIADkDQABiagRhoQgHgrgShHQgUhVgGgeQgOhOgKgnQgRhHglhSIgVgyQgLgdgEgXQgEgdAFgaQAGgdARgTQAMgNAbgVIAlgjQApgmAzgUQArgSA6gFQAjgEBGAAICkAAQBbABBIAGQBOAGAuARQA8AVAzAzQASARAIAFQAJAGAPAFIAZAGQA4AQAwAkQAvAlAeAzIALAUQAiAsANAoQAJAeAAAmQAAAagFArQgKBkgTA6QgaBWg3A0IgXAVQgOAMgHAKQgMARgHAaIgJAvQgFAegOA9QgLA2gCAlIgCA+QgBAdgDAVIACArQACB5gJDzIgFB9IgCBcQgDA1gFAoIgLBPQgEAtAJAhQAFATANAmQARA+gbAxQgTAigoAXQgeASgxAPQiFAqiIAHIg4ACQhvAAhqgYg");
	mask.setTransform(531.8238,189.7375);

	// Layer_5
	this.instance = new lib.Symbol54();
	this.instance.setTransform(476.6,211.45,0.566,0.566,0,0,0,138.8,217.8);

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(40));

	// Layer_4
	this.instance_1 = new lib.car1();
	this.instance_1.setTransform(334,160.8,1,1,0,0,0,334,160.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(40));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,670,322.7);


(lib.c1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// timeline functions:
	this.frame_39 = function() {
		this.stop();
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).wait(39).call(this.frame_39).wait(1));

	// Layer_5 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AlMP3QgWgLgJgBQgJgBgLAEIgUAIQgXAKggACQgWABgigDQhVgIg9gSQhOgXg2gpQhAgygphTQglhJgNhcQgLhHAAhkQAChzABg5IgCiTQAAhXAFg7QADgaAMhNQAKhBABgnIACiOQAChUASg2QAPgsAegnQAdgmAngaQA1gkBWgVQAxgMBkgVQA8gOAZgbQATgWAOg1QAPg3AQgVQAggqBGgGQAXgCAjADIA6AEQBJADBygWQCZgdAkgEQAggEAygCIBRgDIBKgFQArgCAfACQAdACA4AIQA7AIAbAQQAaAOAUAdQAPAWAQAjQBKCkAIC/IABBqQABBCAEAoQACAWAJA6QAIAyACAdQACAggCBBQgBBAACAfQACAnALA5IATBfQASBoAABqQAAB9ghBNQgeBHg9A4Qg+A5hbAlQhMAfhkAUQhKAPieATQiaAShOAQIiKAgQhSASg6AFIgeACQgoAAgagMg");
	mask.setTransform(514.5,210.9704);

	// Layer_4
	this.instance = new lib.Symbol54();
	this.instance.setTransform(580.75,176.85,1,1,0,0,0,138.9,217.7);

	var maskedShapeInstanceList = [this.instance];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(40));

	// BG
	this.instance_1 = new lib.car1();
	this.instance_1.setTransform(335,164.2,1,1,0,0,0,335,164.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(40));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,670,322.8);


(lib.cak = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// card_3
	this.c33 = new lib.c3();
	this.c33.name = "c33";
	this.c33.setTransform(382.6,170.3,1.0002,1,0,0,0,334.9,164.2);

	this.timeline.addTween(cjs.Tween.get(this.c33).wait(1));

	// card_2
	this.c22 = new lib.c2();
	this.c22.name = "c22";
	this.c22.setTransform(380,169.4,0.9994,0.9992,0,0,0,332.5,163.2);

	this.timeline.addTween(cjs.Tween.get(this.c22).wait(1));

	// card_1
	this.c11 = new lib.c1();
	this.c11.name = "c11";
	this.c11.setTransform(382.25,170.2,1,1,0,0,0,335,164.2);

	this.timeline.addTween(cjs.Tween.get(this.c11).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.cak, new cjs.Rectangle(47.3,-72.8,913.6,511.1), null);


(lib.bg2_1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// timeline functions:
	this.frame_0 = function() {
		this.stop();
		var t;
		var h
		var root = this;
		var list_card = [root.pull.c11, root.pull.c22,root.pull.c33];
		var location = [root.pull.c11.y, root.pull.c11.y + 340,root.pull.c11.y + 680];
		var run;
		var doc;
		var c1x = this.pull.c11.x
		this.pull.on("mousedown", function (evt) {
		
			this.stop();
			t = evt.stageX;
			h = evt.stageY;
		
		});
		
		this.pull.c22.y = this.pull.c11.y + 340;
		this.pull.c33.y = this.pull.c11.y + 680;
		
		
		
		
		var card3x = this.pull.c33.x;
		var card3y = this.pull.c33.y;
		
		this.pull.on("pressmove", function (evt) {
		
			run = t - evt.stageX;
			doc = h - evt.stageY;
		
		});
		
		this.pull.on("pressup", function (evt) {
		
			list_card[0].alpha = 1;
			list_card[1].alpha = 1;
			
			if (run >= 50 && doc < 200 || run < -50 && doc < 200 ) {
				change();
			}
		else if (doc>200  )
		{
			changedoc()
		}
		
		
		})
		function changedoc(){
			
			createjs.Tween.get(list_card[0]).to({
				alpha: 0,
				}, 300);
		
			createjs.Tween.get(list_card[1]).to({
				y: location[0],
			}, 300);
		createjs.Tween.get(list_card[2]).to({
				y: location[1],
			}, 300);
		list_card[0].y = location[2]+ 1080;
			createjs.Tween.get(list_card[0]).to({
				alpha :1,
				y: location[2],
			}, 300);
				const element = list_card.splice(0, 1)[0];
				list_card.splice(list_card.length, 0, element);
			run = 0;
			doc = 0;
		}
		function change() {
			
		}
		this.hit.removeAllEventListeners('click');
		this.hit.addEventListener('click', clickTrackingYomedia);
	}
	this.frame_23 = function() {
		this.stop();
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(23).call(this.frame_23).wait(1));

	// shape
	this.instance = new lib.Symbol4("synched",0);
	this.instance.setTransform(318.45,593.15,1,1,0,0,0,977.1,64.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(24));

	// footer
	this.instance_1 = new lib.Symbol16();
	this.instance_1.setTransform(244.25,-77.65,3.78,3.78,0,0,0,240.1,195.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(24));

	// pull
	this.pull = new lib.cak();
	this.pull.name = "pull";
	this.pull.setTransform(304.5,2296.3,2.3253,2.3246,0,0,0,385.4,675.3);

	this.timeline.addTween(cjs.Tween.get(this.pull).wait(24));

	// hit
	this.hit = new lib.hit();
	this.hit.name = "hit";
	this.hit.setTransform(310.3,1837.9,5.0564,5.786,0,0,0,0.2,0.3);
	new cjs.ButtonHelper(this.hit, 0, 1, 2, false, new lib.hit(), 3);

	this.timeline.addTween(cjs.Tween.get(this.hit).wait(24));

	// full_size_copy
	this.full_size = new lib.full_size();
	this.full_size.name = "full_size";
	this.full_size.setTransform(295.75,2095,2.4986,2.4986,0,0,0,382.5,683.5);

	this.timeline.addTween(cjs.Tween.get(this.full_size).wait(24));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-675.7,-528,2318.3,4340.1);


(lib.all = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		minYoMediaPopupAd();
		var root = this;
		this.stop();
		stage.preventSelection = false;
		createjs.Touch.enable(stage, true, true);
		var _self = this;
		var b_c;
		var check;
		//Detect Device
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
			check = 190;
			//root.minimize.x = 328;
			//root.minimize.y = 126;
		} else {
			check = 125;
		}
		
		this.footer.on("mousedown", function (evt) {
			this.stop();
			this.offset = {
				x: 0,
				y: 0
			};
			b_c = this;
			b_c.yy = this.y;
		});
		this.footer.on("pressmove", function (evt) {
			console.log("pressmove");
			this.y = (evt.stageY + this.offset.y) / stage.scaleY;
		
			if (this.y < 500) {
				go();
				root.pull.visible = false;
		
			}
		});
		onUp = function () {
			if (b_c !== undefined) {
				b_c.y = b_c.yy;
			}
		};
		window.addEventListener("mouseup", onUp);
		function onUp() {}
		function go() {
			setYoMediaExpand();
			create();
			createjs.Tween.get(root.footer).to({
				y: check,
			}, 500);
			root.footer.removeAllEventListeners("pressmove");
		}
		function showfooter() {
			createjs.Tween.get(root.footer).to({
				y: 620,
			}, 500);
		}
		function create()
				{
				stage.preventSelection = true;
				}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// pull
	this.pull = new lib.pull();
	this.pull.name = "pull";
	this.pull.setTransform(194.4,517.65,1.1815,1.1823,0,0,0,0,-2);

	this.timeline.addTween(cjs.Tween.get(this.pull).wait(1));

	// footer
	this.footer = new lib.bg2_1();
	this.footer.name = "footer";
	this.footer.setTransform(131.9,615.9,0.1996,0.1996,0,0,0,0.2,0);

	this.timeline.addTween(cjs.Tween.get(this.footer).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.all, new cjs.Rectangle(-3,504.1,462.7,693.4999999999999), null);


// stage content:
(lib._384x683 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.main_mc = new lib.all();
	this.main_mc.name = "main_mc";
	this.main_mc.setTransform(-0.05,-24.3);

	this.timeline.addTween(cjs.Tween.get(this.main_mc).wait(1));

	// stageBackground
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("rgba(0,0,0,0)").ss(1,1,1,3,true).p("Egfjg26MA/HAAAMAAABt1Mg/HAAAg");
	this.shape.setTransform(192,341.5);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(37,37,37,0)").s().p("EgfjA27MAAAht1MA/HAAAMAAABt1g");
	this.shape_1.setTransform(192,341.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new lib.AnMovieClip();
p.nominalBounds = new cjs.Rectangle(188.9,821.3,270.79999999999995,352);
// library properties:
lib.properties = {
	id: 'A4FA1DF7FACC5147A6CA45925C40F56F',
	width: 384,
	height: 683,
	fps: 24,
	color: "#252525",
	opacity: 0.00,
	manifest: [
		{src:"images/_1001.png?1779433949212", id:"_1001"},
		{src:"images/BBMATONG.png?1779433949212", id:"BBMATONG"},
		{src:"images/bg2.png?1779433949212", id:"bg2"},
		{src:"images/bgpngcopy1.png?1779433949212", id:"bgpngcopy1"},
		{src:"images/card1.png?1779433949212", id:"card1"},
		{src:"images/CTA.png?1779433949212", id:"CTA"},
		{src:"images/cumsp.png?1779433949212", id:"cumsp"},
		{src:"images/fss.png?1779433949212", id:"fss"},
		{src:"images/HQM.png?1779433949212", id:"HQM"},
		{src:"images/lanhuongpngcopy.png?1779433949212", id:"lanhuongpngcopy"},
		{src:"images/lightcuaso.png?1779433949212", id:"lightcuaso"},
		{src:"images/LOGO.png?1779433949212", id:"LOGO"},
		{src:"images/Tagline.png?1779433949212", id:"Tagline"},
		{src:"images/TL.png?1779433949212", id:"TL"}
	],
	preloads: []
};



// bootstrap callback support:

(lib.Stage = function(canvas) {
	createjs.Stage.call(this, canvas);
}).prototype = p = new createjs.Stage();

p.setAutoPlay = function(autoPlay) {
	this.tickEnabled = autoPlay;
}
p.play = function() { this.tickEnabled = true; this.getChildAt(0).gotoAndPlay(this.getTimelinePosition()) }
p.stop = function(ms) { if(ms) this.seek(ms); this.tickEnabled = false; }
p.seek = function(ms) { this.tickEnabled = true; this.getChildAt(0).gotoAndStop(lib.properties.fps * ms / 1000); }
p.getDuration = function() { return this.getChildAt(0).totalFrames / lib.properties.fps * 1000; }

p.getTimelinePosition = function() { return this.getChildAt(0).currentFrame / lib.properties.fps * 1000; }

an.bootcompsLoaded = an.bootcompsLoaded || [];
if(!an.bootstrapListeners) {
	an.bootstrapListeners=[];
}

an.bootstrapCallback=function(fnCallback) {
	an.bootstrapListeners.push(fnCallback);
	if(an.bootcompsLoaded.length > 0) {
		for(var i=0; i<an.bootcompsLoaded.length; ++i) {
			fnCallback(an.bootcompsLoaded[i]);
		}
	}
};

an.compositions = an.compositions || {};
an.compositions['A4FA1DF7FACC5147A6CA45925C40F56F'] = {
	getStage: function() { return exportRoot.stage; },
	getLibrary: function() { return lib; },
	getSpriteSheet: function() { return ss; },
	getImages: function() { return img; }
};

an.compositionLoaded = function(id) {
	an.bootcompsLoaded.push(id);
	for(var j=0; j<an.bootstrapListeners.length; j++) {
		an.bootstrapListeners[j](id);
	}
}

an.getComposition = function(id) {
	return an.compositions[id];
}


an.makeResponsive = function(isResp, respDim, isScale, scaleType, domContainers) {		
	var lastW, lastH, lastS=1;		
	window.addEventListener('resize', resizeCanvas);		
	resizeCanvas();		
	function resizeCanvas() {			
		var w = lib.properties.width, h = lib.properties.height;			
		var iw = window.innerWidth, ih=window.innerHeight;			
		var pRatio = window.devicePixelRatio || 1, xRatio=iw/w, yRatio=ih/h, sRatio=1;			
		if(isResp) {                
			if((respDim=='width'&&lastW==iw) || (respDim=='height'&&lastH==ih)) {                    
				sRatio = lastS;                
			}				
			else if(!isScale) {					
				if(iw<w || ih<h)						
					sRatio = Math.min(xRatio, yRatio);				
			}				
			else if(scaleType==1) {					
				sRatio = Math.min(xRatio, yRatio);				
			}				
			else if(scaleType==2) {					
				sRatio = Math.max(xRatio, yRatio);				
			}			
		}
		domContainers[0].width = w * pRatio * sRatio;			
		domContainers[0].height = h * pRatio * sRatio;
		domContainers.forEach(function(container) {				
			container.style.width = w * sRatio + 'px';				
			container.style.height = h * sRatio + 'px';			
		});
		stage.scaleX = pRatio*sRatio;			
		stage.scaleY = pRatio*sRatio;
		lastW = iw; lastH = ih; lastS = sRatio;            
		stage.tickOnUpdate = false;            
		stage.update();            
		stage.tickOnUpdate = true;		
	}
}
an.handleSoundStreamOnTick = function(event) {
	if(!event.paused){
		var stageChild = stage.getChildAt(0);
		if(!stageChild.paused || stageChild.ignorePause){
			stageChild.syncStreamSounds();
		}
	}
}
an.handleFilterCache = function(event) {
	if(!event.paused){
		var target = event.target;
		if(target){
			if(target.filterCacheList){
				for(var index = 0; index < target.filterCacheList.length ; index++){
					var cacheInst = target.filterCacheList[index];
					if((cacheInst.startFrame <= target.currentFrame) && (target.currentFrame <= cacheInst.endFrame)){
						cacheInst.instance.cache(cacheInst.x, cacheInst.y, cacheInst.w, cacheInst.h);
					}
				}
			}
		}
	}
}


})(createjs = createjs||{}, AdobeAn = AdobeAn||{});
var createjs, AdobeAn;