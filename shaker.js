/*

                ----========############========----
                             Shaker.js 
                ----========############========----

Copyright:

Henrik Gustavsson 
henrik.gustavsson@his.se

Marcus Brohede
marcus.brohede@his.se
 
Inspired By
---------------------------------
					gyro.js by Tom Gallacher <tom.gallacher23@gmail.com>
					shake.js http://alxgbsn.co.uk/ by Alex Gibson
					hammer.js http://eightmedia.github.io/hammer.js
					html5rocks A Simple Trip Meter using the Geolocation API by Michael Mahemoff 
					Moveable Type Scripts - http://www.movable-type.co.uk/scripts/latlong.html
					
Events supported
------------------
          shake          (Device Shake)
             shakeX
             shakeY
             shakeZ
          step           (Device Jolt i.e. Accelerometer Change)
             stepX
             stepY
             stepZ
          orient         (Device Orientation change)
          reorient       (Device Reorientation)
             reorientX
             reorientY
             reorientZ
          
Properties supported
----------------------
          steptreshold      (jolt sensitivity treshold)
          stepinterval      (jolt timing interval)
          shaketreshold     (shake sensitivity treshold)
          shakeinterval     (shake timing interval)

          orienttreshold    (orientation sensitivity treshold)
          shakelength       (time before forgetting shake)

How to use
-----------------------

<script src="shaker.js"></script>

<script>
  shaker.startTracking(function(o) {
    // o.x, o.y, o.z for accelerometer
    // o.alpha, o.beta, o.gamma for gyro
  });
</script>


Fixed Bugs:
-----------------------
* Shake detection does not work if step events are not defined. This now works by enabling step if we enable shake.
* Too many events too often - only define new events if variable is null
* Step counts not updated if no callback was defined.


-------------------------------------------------------------------------------------------
The MIT License (MIT)
-------------------------------------------------------------------------------------------

Copyright (c) 2014 Henrik Gustavsson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

// We base our code on the window,document Self-Executing Anonymous Function pattern


(function (window, document) {

	var measurements = {
				// Basics
				x: null,
				y: null,
				z: null,
				alpha: null,
				beta: null,
				gamma: null,

				// Navigation
				cumulativedist:null,
				startdist:null,
				kmh : null,
				kmhtot : null,
				timetot : null,
				
				// Positioning
				latitude:null,
				longitude:null,
				positioncount:null,

				// Shake Detection
				dx:null,
				dy:null,
				dz:null,
				d:null,
				
				shakes:null,
				shakesX:null,
				shakesY:null,
				shakesZ:null,
				
				shakecnt:null,
				shakeXcnt:null,
				shakeYcnt:null,
				shakeZcnt:null
				
			},

			lastmeasure = {
				x: 0,
				y: 0,
				z: 0,
				
				shaked:0,
				shakedX:0,
				shakedY:0,
				shakedZ:0,

				shakedstart:0,
				shakedXstart:0,
				shakedYstart:0,
				shakedZstart:0,
				
				shakecnt:0,
				shakeXcnt:0,
				shakeYcnt:0,
				shakeZcnt:0,
				isShaking:0,

				cumulativedist:null
		};
		
		var navigated=false;
	
		var doprintout=true;

		// Distance from startingpoint, cumulative distance, and last time
		var startPos = null;
		var lastPos = null;

		var lastTime = null;

		var	shakeinterval = null;
		var geointerval = null;
		var stepinterval = null;

		var shakecallback = null;
		var shakecallbackX = null;
		var shakecallbackY = null;
		var shakecallbackZ = null;

		var stepcallback = null;
		var stepcallbackX = null;
		var stepcallbackY = null;
		var stepcallbackZ = null;
			
		window.shaker={}
		
		shaker.shaketreshold = 4;
		shaker.stepfrequency = 500; 
		shaker.shakefrequency = 1500; 

		shaker.hasGeoLocation = false;
		shaker.geolocationcallback = null;
		shaker.geofrequency = 30000;				

		shaker.on = function(eventkind,callback)
		{
				if(eventkind=="shake"){
						shakecallback=callback;
				}else if(eventkind=="shakeX"){
						shakecallbackX=callback;
				}else if(eventkind=="shakeY"){
						shakecallbackY=callback;
				}else if(eventkind=="shakeZ"){
						shakecallbackZ=callback;
				}else if(eventkind=="step"){
						stepcallback=callback;
				}else if(eventkind=="stepX"){
						stepcallbackX=callback;
				}else if(eventkind=="stepY"){
						stepcallbackY=callback;
				}else if(eventkind=="stepZ"){
						stepcallbackZ=callback;
				}else if(eventkind=="geolocation"){
						geolocationcallback=callback;
						geointerval = setInterval(function() { evalgeo(); }, shaker.geofrequency);
				}else{
						alert('Unknown Shaker Event: '+eventkind);
				}

				if(eventkind=="step"||eventkind=="stepX"||eventkind=="stepY"||eventkind=="stepZ"||eventkind=="shake"||eventkind=="shakeX"||eventkind=="shakeY"||eventkind=="shakeZ"){
						if(stepinterval==null){
								stepinterval = setInterval(function() { evalstep(); }, shaker.stepfrequency);
								shaker.shakecnt = 0;
								shaker.shakecntX = 0;
								shaker.shakecntY = 0;
								shaker.shakecntZ = 0;						
						}
				}
				if(eventkind=="shake"||eventkind=="shakeX"||eventkind=="shakeY"||eventkind=="shakeZ"){
						if(shakeinterval==null){
								shakeinterval = setInterval(function() { evalshake(); }, shaker.shakefrequency);
						}
				}

		}

		shaker.getOrientation = function() {
				return measurements;
		};

		shaker.stopTracking = function() {
				if(shakeinterval!=null) clearInterval(shakeinterval);
				if(stepinterval!=null) clearInterval(stepinterval);
				if(geointerval!=null) clearInterval(geointerval);
		};

		shaker.startGeolocation = function()
		{
				if (navigator.geolocation) {					
		
						navigator.geolocation.getCurrentPosition(
						function(pos){
								// Geolocation - startPos == start position lastPos == last cumulative measurement
					      startPos = pos;
					      lastPos = pos;
					      measurements.cumulativedist = 0;
								lastTime = new Date().getTime();
					    	shaker.hasGeoLocation=true;
					    	measurements.positioncount=0;
					    	measurements.timetot=0;
		
								if(doprintout) document.getElementById("printout").innerHTML+="Start Position!"+pos.coords.latitude+" "+pos.coords.longitude+"\n";
					    }, function(error) {
					    	shaker.hasGeoLocation=false;
								if(doprintout) document.getElementById("printout").innerHTML+="Position Error!"+error.code+"\n";
					    });
													
						function error(err) {
						  console.warn('ERROR(' + err.code + '): ' + err.message);
						};
						
						options = {
						  enableHighAccuracy: false,
						  timeout: 8000,
						  maximumAge: 0
						};
						
						navigator.geolocation.watchPosition(successNavigation, error, options);
					
				}		
		}

		if (window && window.addEventListener) {

				if(document.getElementById("printout")!=null && doprintout)	document.getElementById("printout").innerHTML+="Listeners Setup!";

				// These listeners update the internal on-demand variables in Shaker
				
				function setupListeners() {

						window.addEventListener('MozOrientation', function(e) {
								measurements.x = e.x;
								measurements.y = e.y;
								measurements.z = e.z;
						}, true);
						window.addEventListener('devicemotion', function(e) {
								measurements.x = e.accelerationIncludingGravity.x;
								measurements.y = e.accelerationIncludingGravity.y;
								measurements.z = e.accelerationIncludingGravity.z;
								
								if(measurements.shakecnt==null){
										measurements.shakecnt=0;
										measurements.shakeXcnt=0;
										measurements.shakeYcnt=0;
										measurements.shakeZcnt=0;
								}
								
						}, true);
						window.addEventListener('deviceorientation', function(e) {
								measurements.alpha = e.alpha;
								measurements.beta = e.beta;
								measurements.gamma = e.gamma;
						}, true);
				
				}
				setupListeners();
		}
				
    function  getDist(lat1, lon1, lat2, lon2) {
        var R = 6371; // km

        var dLat = toRad(lat2-lat1);
        var dLon = toRad(lon2-lon1);

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;
        return d;
    }
     
    function toRad(num) {
        return num * Math.PI / 180;
    }  

		function errorCallback(){
				alert("NAVIGATION ERROR!");
		}
	
		function successNavigation(pos) {
				if(startPos!=null){
						// Update "simple" geolocation variables
						measurements.startdist=getDist(startPos.coords.latitude, startPos.coords.longitude, pos.coords.latitude, pos.coords.longitude);
						measurements.latitude=pos.coords.latitude;										
						measurements.longitude=pos.coords.longitude;
						measurements.positioncount++;
		    		
		    		var currdist=getDist(lastPos.coords.latitude, lastPos.coords.longitude, pos.coords.latitude, pos.coords.longitude);

						if(doprintout) document.getElementById("printout").innerHTML+="Distdelta:"+currdist+"\n";

						// If rounding error cumulative distance > 70m
						if(currdist>0.07){
								// Update current measuring position
								lastPos=pos;
								measurements.cumulativedist+=currdist;
								
								var newTime = new Date().getTime();
								timedelta=(newTime-lastTime)/1000;
																				
								measurements.timetot+=timedelta;
								
								measurements.kmh=currdist/(timedelta/3600);
								measurements.kmhtot=measurements.cumulativedist/(measurements.timetot/3600);
																				
								lastTime=newTime;
						}
					}else{
							console.log("Startpos null!");
					}
					navigated=true;
		};

		function evalgeo() {
				if(navigated){
						var ddist=lastmeasure.cumulativedist-measurements.cumulativedist;
						if(Math.abs(ddist)>0){
								geolocationcallback(measurements);
						}
						lastmeasure.cumulativedist=measurements.cumulativedist;
				}else{
						navigator.geolocation.getCurrentPosition(function(pos) {
								successNavigation(pos);
						});
				}
				
				navigated=false;
		};
		
		function evalshake() {

				var shaked=0;
				var shakedX=0;

				if(lastmeasure.shakecnt!=null){
						shaked=measurements.shakecnt-lastmeasure.shakecnt;						
						if(shaked>0&&lastmeasure.shaked==0){
							lastmeasure.shakedstart=lastmeasure.shakecnt;
						}else if(shaked==0&&lastmeasure.shaked>0){
									var shakedss=measurements.shakecnt-lastmeasure.shakedstart;
									if(shakedss>=shaker.shaketreshold){
											measurements.shakes=shakedss;
											if(shakecallback!=null) shakecallback(measurements);		
									}
						}

						shakedX=measurements.shakeXcnt-lastmeasure.shakeXcnt;
						if(shakedX>0&&lastmeasure.shakedX==0){
							lastmeasure.shakedXstart=lastmeasure.shakeXcnt;
						}else if(shakedX==0&&lastmeasure.shakedX>0){
									var shakedss=measurements.shakeXcnt-lastmeasure.shakedXstart;
									if(shakedss>=shaker.shaketreshold){
											measurements.shakes=shakedss;
											if(shakecallbackX!=null) shakecallbackX(measurements);		
									}
						}

						shakedY=measurements.shakeYcnt-lastmeasure.shakeYcnt;
						if(shakedY>0&&lastmeasure.shakedY==0){
							lastmeasure.shakedYstart=lastmeasure.shakeYcnt;
						}else if(shakedY==0&&lastmeasure.shakedY>0){
									var shakedss=measurements.shakeYcnt-lastmeasure.shakedYstart;
									if(shakedss>=shaker.shaketreshold){
											measurements.shakes=shakedss;
											if(shakecallbackY!=null) shakecallbackY(measurements);		
									}
						}

						shakedZ=measurements.shakeZcnt-lastmeasure.shakeZcnt;
						if(shakedZ>0&&lastmeasure.shakedZ==0){
							lastmeasure.shakedZstart=lastmeasure.shakeZcnt;
						}else if(shakedZ==0&&lastmeasure.shakedZ>0){
									var shakedss=measurements.shakeZcnt-lastmeasure.shakedZstart;
									if(shakedss>=shaker.shaketreshold){
											measurements.shakes=shakedss;
											if(shakecallbackZ!=null) shakecallbackZ(measurements);		
									}
						}

				}
				lastmeasure.shakecnt=measurements.shakecnt;
				lastmeasure.shaked=shaked;

				lastmeasure.shakeXcnt=measurements.shakeXcnt;
				lastmeasure.shakedX=shakedX;

				lastmeasure.shakeYcnt=measurements.shakeYcnt;
				lastmeasure.shakedY=shakedY;

				lastmeasure.shakeZcnt=measurements.shakeZcnt;
				lastmeasure.shakedZ=shakedZ;
		}

		function evalstep() {

				// If there is a measurement to evaluate
				if(lastmeasure.x!=null){
						dx=lastmeasure.x-measurements.x;
						dy=lastmeasure.y-measurements.y;
						dz=lastmeasure.z-measurements.z;
						d=Math.sqrt((dx*dx)+(dy*dy)+(dz*dz));
						
						measurements.d=d;
						measurements.dx=dx;
						measurements.dy=dy;		
						measurements.dz=dz;
		
						// if we detect a step, increase step counts
						if(Math.abs(dx)>3){
								if(stepcallbackX!=null) stepcallbackX(measurements);
								measurements.shakeXcnt++;
						}
						if(Math.abs(dy)>3){
						 		if(stepcallbackY!=null) stepcallbackY(measurements);				
								measurements.shakeYcnt++;
						}
						if(Math.abs(dz)>3){
								if(stepcallbackZ!=null) stepcallbackZ(measurements);
								measurements.shakeZcnt++;
						} 
						if(d>3){
								if(stepcallback!=null) stepcallback(measurements);
								measurements.shakecnt++;
						} 				
				}

				lastmeasure.x=measurements.x;
				lastmeasure.y=measurements.y;
				lastmeasure.z=measurements.z;

		};

}(window, document));

