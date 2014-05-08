document.getElementById('range-1').onchange = function(evnt) {

	filters.stackBlurCanvas("canvas-1", this.value);

}
document.getElementById('range-2').onchange = function(evnt) {
	filters.noise("canvas-1", this.value * 0.01);
}
document.getElementById('range-3').onchange = function(evnt) {
	filters.median("canvas-1", this.value);
}
document.getElementById("applyLight").onclick = function() {

	var canvas = document.getElementById('canvas-1'),
		context = canvas.getContext("2d"),
		imageData = context.getImageData(0, 0, canvas.width, canvas.height);

	context.putImageData(filters.brightness(imageData, 20), 0, 0);

};
document.getElementById("doSomeStaff").onclick = function() {

	var canvas = document.getElementById('canvas-1');
	
	filters.workingCopy.src = canvas.toDataURL("image/png");

};
document.getElementById("resetBtn").onclick = function() {

	var canvas = document.getElementById('canvas-1'),
		context = canvas.getContext("2d");

		context.drawImage(filters.originalImg, 0, 0);		
	
	filters.workingCopy.src = canvas.toDataURL("image/png");

};

function checkSize() {
	var imgFile = document.getElementById('submitfile');
	if (imgFile.files && imgFile.files[0]) {
		var width;
		var height;
		var fileSize;

		var reader = new FileReader();
		reader.onload = function(event) {

			var dataUri = event.target.result;

			filters.workingCopy = document.createElement("img");
			filters.originalImg = document.createElement("img");

			filters.workingCopy.src = dataUri;
			filters.originalImg.src = dataUri;

			filters.stackBlurImage('canvas-1');
		};
		reader.onerror = function(event) {
			console.error("File could not be read! Code " + event.target.error.code);
		};
		reader.readAsDataURL(imgFile.files[0]);
	}
}

function stackBlurCanvasRGB(id, top_x, top_y, width, height, radius) {
	if (isNaN(radius) || radius < 1) return;
	radius |= 0;

	var canvas = document.getElementById(id);
	var context = canvas.getContext("2d");
	var imageData;

	try {
		try {
			imageData = context.getImageData(top_x, top_y, width, height);
		} catch (e) {

			// NOTE: this part is supposedly only needed if you want to work with local files
			// so it might be okay to remove the whole try/catch block and just use
			// imageData = context.getImageData( top_x, top_y, width, height );
			try {
				netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
				imageData = context.getImageData(top_x, top_y, width, height);
			} catch (e) {
				alert("Cannot access local image");
				throw new Error("unable to access local image data: " + e);
				return;
			}
		}
	} catch (e) {
		alert("Cannot access image");
		throw new Error("unable to access image data: " + e);
	}

	var pixels = imageData.data;

	var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
		r_out_sum, g_out_sum, b_out_sum,
		r_in_sum, g_in_sum, b_in_sum,
		pr, pg, pb, rbs;

	var div = radius + radius + 1;
	var w4 = width << 2;
	var widthMinus1 = width - 1;
	var heightMinus1 = height - 1;
	var radiusPlus1 = radius + 1;
	var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

	var stackStart = new BlurStack();
	var stack = stackStart;
	for (i = 1; i < div; i++) {
		stack = stack.next = new BlurStack();
		if (i == radiusPlus1) var stackEnd = stack;
	}
	stack.next = stackStart;
	var stackIn = null;
	var stackOut = null;

	yw = yi = 0;

	var mul_sum = mul_table[radius];
	var shg_sum = shg_table[radius];

	for (y = 0; y < height; y++) {
		r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;

		r_out_sum = radiusPlus1 * (pr = pixels[yi]);
		g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
		b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		for (i = 1; i < radiusPlus1; i++) {
			p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
			r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
			g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
			b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;

			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;

			stack = stack.next;
		}


		stackIn = stackStart;
		stackOut = stackEnd;
		for (x = 0; x < width; x++) {
			pixels[yi] = (r_sum * mul_sum) >> shg_sum;
			pixels[yi + 1] = (g_sum * mul_sum) >> shg_sum;
			pixels[yi + 2] = (b_sum * mul_sum) >> shg_sum;

			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;

			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;

			p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

			r_in_sum += (stackIn.r = pixels[p]);
			g_in_sum += (stackIn.g = pixels[p + 1]);
			b_in_sum += (stackIn.b = pixels[p + 2]);

			r_sum += r_in_sum;
			g_sum += g_in_sum;
			b_sum += b_in_sum;

			stackIn = stackIn.next;

			r_out_sum += (pr = stackOut.r);
			g_out_sum += (pg = stackOut.g);
			b_out_sum += (pb = stackOut.b);

			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;

			stackOut = stackOut.next;

			yi += 4;
		}
		yw += width;
	}


	for (x = 0; x < width; x++) {
		g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;

		yi = x << 2;
		r_out_sum = radiusPlus1 * (pr = pixels[yi]);
		g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
		b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		yp = width;

		for (i = 1; i <= radius; i++) {
			yi = (yp + x) << 2;

			r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
			g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
			b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;

			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;

			stack = stack.next;

			if (i < heightMinus1) {
				yp += width;
			}
		}

		yi = x;
		stackIn = stackStart;
		stackOut = stackEnd;
		for (y = 0; y < height; y++) {
			p = yi << 2;
			pixels[p] = (r_sum * mul_sum) >> shg_sum;
			pixels[p + 1] = (g_sum * mul_sum) >> shg_sum;
			pixels[p + 2] = (b_sum * mul_sum) >> shg_sum;

			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;

			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;

			p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

			r_sum += (r_in_sum += (stackIn.r = pixels[p]));
			g_sum += (g_in_sum += (stackIn.g = pixels[p + 1]));
			b_sum += (b_in_sum += (stackIn.b = pixels[p + 2]));

			stackIn = stackIn.next;

			r_out_sum += (pr = stackOut.r);
			g_out_sum += (pg = stackOut.g);
			b_out_sum += (pb = stackOut.b);

			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;

			stackOut = stackOut.next;

			yi += width;
		}
	}

	context.putImageData(imageData, top_x, top_y);

}


/*
 * Pixastic Lib - Noise filter - v0.1.0
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * License: [http://www.pixastic.com/lib/license.txt]
 */

var filters = {

	originalImg: {},

	workingCopy: {},

	mul_table: [
		512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
		454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
		482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
		437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
		497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
		320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
		446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
		329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
		505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
		399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
		324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
		268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
		451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
		385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
		332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
		289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259
	],


	shg_table: [
		9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
		17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
		19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
		20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
		21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
		21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
		22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
		22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24
	],

	stackBlurImage: function(canvasID) {

		var w = this.workingCopy.naturalWidth;
		var h = this.workingCopy.naturalHeight;

		var canvas = document.getElementById(canvasID);

		canvas.style.width = w + "px";
		canvas.style.height = h + "px";
		canvas.width = w;
		canvas.height = h;

		var context = canvas.getContext("2d");
		context.clearRect(0, 0, w, h);
		context.drawImage(this.workingCopy, 0, 0);

	},

	stackBlurCanvas: function(canvasID, radius) {
		if (isNaN(radius) || radius < 1) return;
		radius |= 0;


		var canvas = document.getElementById(canvasID);
		var width = canvas.width;
		var height = canvas.height;
		var context = canvas.getContext("2d");
		var imageData;
		var top_x = 0;
		var top_y = 0;

		context.drawImage(this.workingCopy, 0, 0);

		try {
			try {
				imageData = context.getImageData(top_x, top_y, width, height);
			} catch (e) {

				// NOTE: this part is supposedly only needed if you want to work with local files
				// so it might be okay to remove the whole try/catch block and just use
				// imageData = context.getImageData( top_x, top_y, width, height );
				try {
					netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
					imageData = context.getImageData(top_x, top_y, width, height);
				} catch (e) {
					alert("Cannot access local image");
					throw new Error("unable to access local image data: " + e);
					return;
				}
			}
		} catch (e) {
			alert("Cannot access image");
			throw new Error("unable to access image data: " + e);
		}

		var pixels = imageData.data;

		var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum,
			r_out_sum, g_out_sum, b_out_sum, a_out_sum,
			r_in_sum, g_in_sum, b_in_sum, a_in_sum,
			pr, pg, pb, pa, rbs;

		var div = radius + radius + 1;
		var w4 = width << 2;
		var widthMinus1 = width - 1;
		var heightMinus1 = height - 1;
		var radiusPlus1 = radius + 1;
		var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

		var stackStart = new this.BlurStack();
		var stack = stackStart;
		for (i = 1; i < div; i++) {
			stack = stack.next = new this.BlurStack();
			if (i == radiusPlus1) var stackEnd = stack;
		}
		stack.next = stackStart;
		var stackIn = null;
		var stackOut = null;

		yw = yi = 0;

		var mul_sum = this.mul_table[radius];
		var shg_sum = this.shg_table[radius];

		for (y = 0; y < height; y++) {
			r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;

			r_out_sum = radiusPlus1 * (pr = pixels[yi]);
			g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
			b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
			a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

			r_sum += sumFactor * pr;
			g_sum += sumFactor * pg;
			b_sum += sumFactor * pb;
			a_sum += sumFactor * pa;

			stack = stackStart;

			for (i = 0; i < radiusPlus1; i++) {
				stack.r = pr;
				stack.g = pg;
				stack.b = pb;
				stack.a = pa;
				stack = stack.next;
			}

			for (i = 1; i < radiusPlus1; i++) {
				p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
				r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
				g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
				b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;
				a_sum += (stack.a = (pa = pixels[p + 3])) * rbs;

				r_in_sum += pr;
				g_in_sum += pg;
				b_in_sum += pb;
				a_in_sum += pa;

				stack = stack.next;
			}


			stackIn = stackStart;
			stackOut = stackEnd;
			for (x = 0; x < width; x++) {
				pixels[yi + 3] = pa = (a_sum * mul_sum) >> shg_sum;
				if (pa != 0) {
					pa = 255 / pa;
					pixels[yi] = ((r_sum * mul_sum) >> shg_sum) * pa;
					pixels[yi + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
					pixels[yi + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
				} else {
					pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0;
				}

				r_sum -= r_out_sum;
				g_sum -= g_out_sum;
				b_sum -= b_out_sum;
				a_sum -= a_out_sum;

				r_out_sum -= stackIn.r;
				g_out_sum -= stackIn.g;
				b_out_sum -= stackIn.b;
				a_out_sum -= stackIn.a;

				p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

				r_in_sum += (stackIn.r = pixels[p]);
				g_in_sum += (stackIn.g = pixels[p + 1]);
				b_in_sum += (stackIn.b = pixels[p + 2]);
				a_in_sum += (stackIn.a = pixels[p + 3]);

				r_sum += r_in_sum;
				g_sum += g_in_sum;
				b_sum += b_in_sum;
				a_sum += a_in_sum;

				stackIn = stackIn.next;

				r_out_sum += (pr = stackOut.r);
				g_out_sum += (pg = stackOut.g);
				b_out_sum += (pb = stackOut.b);
				a_out_sum += (pa = stackOut.a);

				r_in_sum -= pr;
				g_in_sum -= pg;
				b_in_sum -= pb;
				a_in_sum -= pa;

				stackOut = stackOut.next;

				yi += 4;
			}
			yw += width;
		}


		for (x = 0; x < width; x++) {
			g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;

			yi = x << 2;
			r_out_sum = radiusPlus1 * (pr = pixels[yi]);
			g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
			b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
			a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

			r_sum += sumFactor * pr;
			g_sum += sumFactor * pg;
			b_sum += sumFactor * pb;
			a_sum += sumFactor * pa;

			stack = stackStart;

			for (i = 0; i < radiusPlus1; i++) {
				stack.r = pr;
				stack.g = pg;
				stack.b = pb;
				stack.a = pa;
				stack = stack.next;
			}

			yp = width;

			for (i = 1; i <= radius; i++) {
				yi = (yp + x) << 2;

				r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
				g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
				b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;
				a_sum += (stack.a = (pa = pixels[yi + 3])) * rbs;

				r_in_sum += pr;
				g_in_sum += pg;
				b_in_sum += pb;
				a_in_sum += pa;

				stack = stack.next;

				if (i < heightMinus1) {
					yp += width;
				}
			}

			yi = x;
			stackIn = stackStart;
			stackOut = stackEnd;
			for (y = 0; y < height; y++) {
				p = yi << 2;
				pixels[p + 3] = pa = (a_sum * mul_sum) >> shg_sum;
				if (pa > 0) {
					pa = 255 / pa;
					pixels[p] = ((r_sum * mul_sum) >> shg_sum) * pa;
					pixels[p + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
					pixels[p + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
				} else {
					pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
				}

				r_sum -= r_out_sum;
				g_sum -= g_out_sum;
				b_sum -= b_out_sum;
				a_sum -= a_out_sum;

				r_out_sum -= stackIn.r;
				g_out_sum -= stackIn.g;
				b_out_sum -= stackIn.b;
				a_out_sum -= stackIn.a;

				p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

				r_sum += (r_in_sum += (stackIn.r = pixels[p]));
				g_sum += (g_in_sum += (stackIn.g = pixels[p + 1]));
				b_sum += (b_in_sum += (stackIn.b = pixels[p + 2]));
				a_sum += (a_in_sum += (stackIn.a = pixels[p + 3]));

				stackIn = stackIn.next;

				r_out_sum += (pr = stackOut.r);
				g_out_sum += (pg = stackOut.g);
				b_out_sum += (pb = stackOut.b);
				a_out_sum += (pa = stackOut.a);

				r_in_sum -= pr;
				g_in_sum -= pg;
				b_in_sum -= pb;
				a_in_sum -= pa;

				stackOut = stackOut.next;

				yi += width;
			}
		}

		context.putImageData(imageData, top_x, top_y);

	},

	BlurStack: function() {
		this.r = 0;
		this.g = 0;
		this.b = 0;
		this.a = 0;
		this.next = null;
	},

	noise: function(canvasID, amount) {
		var params = {
			options: {
				mono: true,
				amount: amount,
				strength: 0.5
			}
		};
		var amount = 0;
		var strength = 0;
		var mono = false;

		if (typeof params.options.amount != "undefined")
			amount = parseFloat(params.options.amount) || 0;
		if (typeof params.options.strength != "undefined")
			strength = parseFloat(params.options.strength) || 0;
		if (typeof params.options.mono != "undefined")
			mono = !! (params.options.mono && params.options.mono != "false");

		amount = Math.max(0, Math.min(1, amount));
		strength = Math.max(0, Math.min(1, strength));

		var noise = 128 * strength;
		var noise2 = noise / 2;

		var canvas = document.getElementById(canvasID);
		var context = canvas.getContext("2d");

		context.drawImage(this.workingCopy, 0, 0);

		var w = canvas.width;
		var h = canvas.height;

		var imageData = context.getImageData(0, 0, w, h);

		var data = imageData.data;


		var w4 = w * 4;
		var y = h;
		var random = Math.random;

		do {
			var offsetY = (y - 1) * w4;
			var x = w;
			do {
				var offset = offsetY + (x - 1) * 4;
				if (random() < amount) {
					if (mono) {
						var pixelNoise = -noise2 + random() * noise;
						var r = data[offset] + pixelNoise;
						var g = data[offset + 1] + pixelNoise;
						var b = data[offset + 2] + pixelNoise;
					} else {
						var r = data[offset] - noise2 + (random() * noise);
						var g = data[offset + 1] - noise2 + (random() * noise);
						var b = data[offset + 2] - noise2 + (random() * noise);
					}

					if (r < 0) r = 0;
					if (g < 0) g = 0;
					if (b < 0) b = 0;
					if (r > 255) r = 255;
					if (g > 255) g = 255;
					if (b > 255) b = 255;

					data[offset] = r;
					data[offset + 1] = g;
					data[offset + 2] = b;
				}
			} while (--x);
		} while (--y);

		context.putImageData(imageData, 0, 0);

		return true;
	},

	brightness: function(pixels, adjustment) {
		var d = pixels.data;
		for (var i = 0; i < d.length; i += 4) {
			d[i] += adjustment;
			d[i + 1] += adjustment;
			d[i + 2] += adjustment;
		}
		return pixels;
	},
	grayscale: function(pixels, args) {
		var d = pixels.data;
		for (var i = 0; i < d.length; i += 4) {
			var r = d[i];
			var g = d[i + 1];
			var b = d[i + 2];
			// CIE luminance for the RGB
			// The human eye is bad at seeing red and blue, so we de-emphasize them.
			var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			d[i] = d[i + 1] = d[i + 2] = v
		}
		return pixels;
	},
	someFilter: function(pixels, weights) {
		var side = Math.round(Math.sqrt(weights.length));
		var halfSide = Math.floor(side / 2);
		var src = pixels.data;
		var sw = pixels.width;
		var sh = pixels.height;
		// pad output by the convolution matrix
		var w = sw;
		var h = sh;
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		var output = ctx.createImageData(w, h);
		var dst = output.data;
		// go through the destination image pixels
		var alphaFac = 1;
		for (var y = 0; y < h; y++) {
			for (var x = 0; x < w; x++) {
				var sy = y;
				var sx = x;
				var dstOff = (y * w + x) * 4;
				// calculate the weighed sum of the source image pixels that
				// fall under the convolution matrix
				var r = 0,
					g = 0,
					b = 0,
					a = 0;
				for (var cy = 0; cy < side; cy++) {
					for (var cx = 0; cx < side; cx++) {
						var scy = sy + cy - halfSide;
						var scx = sx + cx - halfSide;
						if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
							var srcOff = (scy * sw + scx) * 4;
							var wt = weights[cy * side + cx];
							r += src[srcOff] * wt;
							g += src[srcOff + 1] * wt;
							b += src[srcOff + 2] * wt;
							a += src[srcOff + 3] * wt;
						}
					}
				}
				dst[dstOff] = r;
				dst[dstOff + 1] = g;
				dst[dstOff + 2] = b;
				dst[dstOff + 3] = a + alphaFac * (255 - a);
			}
		}
		return output;
	},
	median: function(canvasID, radius) {

		var canvas = document.getElementById(canvasID);
		var context = canvas.getContext("2d");



		var win = Math.floor(radius / 2);
		
		var w = canvas.width;
		var h = canvas.height;

		var pixels = context.getImageData(0, 0, w, h);
		var src = pixels.data;

		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		var output = ctx.createImageData(w, h);
		var dst = output.data;


		for (var y = 0; y < h; y++) {
			for (var x = 0; x < w; x++) {
				var sy = y;
				var sx = x;
				var dstOff = (y * w + x) * 4;

				var r_arr = [],
					g_arr = [],
					b_arr = [],
					a_arr = [];

				var r, g, b, a;

				for (var cy = 0; cy < radius; cy++) {
					for (var cx = 0; cx < radius; cx++) {
						var scy = sy + cy - win;
						var scx = sx + cx - win;
						if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
							var srcOff = (scy * w + scx) * 4;

							r_arr.push(src[srcOff]);
							g_arr.push(src[srcOff + 1]);
							b_arr.push(src[srcOff + 2]);
							a_arr.push(src[srcOff + 3]);
						}
					}
				};

				var medPoint = Math.round(r_arr.length / 2);

				r = r_arr.sort()[medPoint];
				g = g_arr.sort()[medPoint];
				b = b_arr.sort()[medPoint];
				a = a_arr.sort()[medPoint];

				dst[dstOff] = r;
				dst[dstOff + 1] = g;
				dst[dstOff + 2] = b;
				dst[dstOff + 3] = a;
			};
		}

		context.putImageData(output, 0, 0);
		console.log("Done!", radius);

		return true;
	}
}


//filters.stackBlurImage("image-1", "canvas-1", 0, true);