class Jogger {

    constructor(){
        var params = {
            dimension_settings: {
                startWidth:400, // pixels
                startHeight:100, // pixels
                xScale:10000, // x units per display element width
                yGrowHysteresis:2000, // milliseconds
                yShrinkHysteresis:500, // milliseconds
            },

            control_settings: {
                scrollRate:1000, // x units per second
                startTime:new Date().getTime(),
                startX:new Date().getTime(),
                minDataBufferSize:10, // display element widths
                graphRefreshShiftLength:3, // display element widths
                scrollUpdateInterval:50, // milliseconds
            },

            style_settings: {
                backgroundColor:"white",
                canvasBackground:"", 
                margin:"0px",
            },

            document_settings: {
                containerId:"jog-" + new Date().getTime().toString(),  
                resizeDetectInterval:100, // milliseconds
            }
        };

        for (const key in arguments[0]) {
            if(!params[key]) { params[key] = arguments[key]; }
            else { for(const member in arguments[0][key]) { params[key][member] = arguments[0][key][member]; } }
        }

        // DOCUMENT
        this.containerElement = document.createElement("div");
        this.intermediateElement = document.createElement("div");
        this.containerElement.appendChild(this.intermediateElement);

        this.containerElement.style.position = "relative";
        this.intermediateElement.style.overflow = "hidden";
        this.intermediateElement.style.position = "relative";

        this.containerElement.id = params.document_settings.containerId;
        this.containerElement.style.width = params.dimension_settings.startWidth.toString() + "px";
        this.containerElement.style.height = params.dimension_settings.startHeight.toString() + "px";
        this.intermediateElement.style.width = this.containerElement.style.width;
        this.intermediateElement.style.height = this.containerElement.style.height;

        this.canvasBackground = params.style_settings.canvasBackground;

        // SCALE
        this.xScale = params.dimension_settings.xScale;
        this.yGrowHysteresis = params.dimension_settings.yGrowHysteresis;
        this.yShrinkHysteresis = params.dimension_settings.yShrinkHysteresis;
        this.resizeDetectInterval = params.document_settings.resizeDetectInterval;

        // CONTROL
        this.scrollRate = params.control_settings.scrollRate;
        this.graphRefreshShiftLength = params.control_settings.graphRefreshShiftLength;
        this.scrollUpdateInterval = params.control_settings.scrollUpdateInterval;
        this.startX = params.control_settings.startX;
        this.frameStartX = this.startX;
        this.drawingFrameStartX = this.frameStartX; // need separate var for drawingFrameStartX to avoid 
                                                    // checking if frozen before drawing every point (let it be 
                                                    // offscreen if buffer has reset)
        this.startTime = params.control_settings.startTime;
        this.elapsedX = 0;
        this.scrollPosition = 0;
        this.minDataBufferSize = params.control_settings.minDataBufferSize;
        this.frozen = false;

        // STYLE
        this.containerElement.style.backgroundColor = params.style_settings.backgroundColor;
        this.containerElement.style.margin = params.style_settings.margin;

        // SERIES
        this.series=[];

        // ENABLE SCROLLING
        this.scrollTimer = setInterval(()=>{
            let delta = this.scrollUpdateInterval / 1000 * this.scrollRate;
            this.elapsedX += delta;
            this.scrollPosition += delta / this.xScale;
            if(!this.frozen) {
                this.scrollForwardTo(this.scrollPosition);
            }
        }, this.scrollUpdateInterval);

        // ENABLE RETURN TO SCROLLING AFTER FREEZING GRAPH FOR PANNING
        document.addEventListener('mousedown', e => {
            let isClickInside = this.containerElement.contains(e.target);
            if (!isClickInside && this.frozen) { 
                this.frozen = false;
                this.drawingFrameStartX = this.frameStartX;
                for ( let i in this.series ) {
                    this.renderBuffer(i);
                }
                this.scrollForwardTo((this.elapsedX - this.frameStartX) / this.xScale);
            }
        });

        // TRUNCATE BUFFERS PERIODICALLY
        setTimeout( ()=>{
            this.bufferShiftTimer = setInterval( ()=>{
                let newFrameStartX = this.frameStartX + this.graphRefreshShiftLength * this.xScale;
                this.startBuffersFrom( newFrameStartX );
                this.frameStartX = newFrameStartX;
                if (!this.frozen) {
                    this.scrollPosition = this.minDataBufferSize;
                    this.scrollForwardTo(this.scrollPosition);
                    this.drawingFrameStartX = this.frameStartX;
                    for (let i in this.series) { this.renderBuffer(i); };
                }
            }, this.graphRefreshShiftLength * this.xScale / this.scrollRate * 1000 );
        }, (this.minDataBufferSize) * this.xScale / this.scrollRate * 1000);

    }

    applyStyle(newStyle = {}) {}

    moveTo(series, normX, normY) {
        let ctx = this.series[series].context;
        var cX = normX * this.containerElement.offsetWidth;
        var cY = (1 - normY) * this.containerElement.offsetHeight;
        ctx.moveTo(cX, cY);
        this.series[series].lastMove = [normX, normY];
    }

    drawLineTo(series, normX, normY) {
        let wNow = this.containerElement.offsetWidth;
        let hNow = this.containerElement.offsetHeight;
        let ctx = this.series[series].context;
        let lastMove = this.series[series].lastMove;
        let cLastMove = [lastMove[0] * wNow, (1 - lastMove[1]) * hNow];
        ctx.moveTo(cLastMove[0], cLastMove[1]);
        var cX = normX * wNow;
        var cY = (1 - normY) * hNow;
        let cMidpointX = ((lastMove[0] + normX)/2)*wNow;
        let controlPoints = [ [cMidpointX, (1-lastMove[1])*hNow], [cMidpointX, cY] ];
        ctx.bezierCurveTo(controlPoints[0][0], controlPoints[0][1], controlPoints[1][0], controlPoints[1][1], cX , cY);
        ctx.stroke();
        this.series[series].lastMove = [normX, normY];
    }

    // scroll such that right edge of the viewing window is normX viewing window widths from the start.
    scrollForwardTo(normX) {
        let newPosition = (1-normX) * this.containerElement.offsetWidth.toString() + "px";
        for(let i in this.series) {
            this.series[i].canvasElement.style.left = newPosition;
        }
    }

    // TODO - this doesn't take into account yScale(s)
    pushDatum(series, x, y) {
        this.series[series].dataBuffer.push([x, y]);
        this.drawLineTo(series, (x - this.drawingFrameStartX) / this.xScale, y);
    }

    clearCanvas(series) {
        let context = this.series[series].context;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        this.series[series].lastMove = [0, 0];
        context.beginPath();
    }

    renderBuffer(series) {
        this.clearCanvas(series);
        this.series[series].lastMove = [0, 0];
        let ctx = this.series[series].context;
        let buffer = this.series[series].dataBuffer;

        let wNow = this.containerElement.offsetWidth;
        let hNow = this.containerElement.offsetHeight;
        let cLastMove = [this.series[series].lastMove[0] * wNow, (1 - this.series[series].lastMove[1]) * hNow];
        let normX, normY;
        for( const i in buffer ) {
            normX = (buffer[i][0] - this.drawingFrameStartX) / this.xScale;
            normY = buffer[i][1];
            ctx.moveTo(cLastMove[0], cLastMove[1]);
            var cX = normX * wNow;
            var cY = (1 - normY) * hNow;
            let cMidpointX = (cLastMove[0] + cX)/2;
            let controlPoints = [ [cMidpointX, cLastMove[1]], [cMidpointX, cY] ];
            ctx.bezierCurveTo(controlPoints[0][0], controlPoints[0][1], controlPoints[1][0], controlPoints[1][1], cX , cY);
            cLastMove = [cX,cY];
        }
        this.series[series].lastMove = [normX, normY];
        ctx.stroke();
    }

    startBuffersFrom( leftMostX ) {
        if (this.scrollPosition > this.minDataBufferSize) {
            for ( let seriesNumber in this.series ) {
                let buffer = this.series[seriesNumber].dataBuffer;
                let datumIndex = 0;
                while ( datumIndex < buffer.length ) { 
                    if( buffer[datumIndex][0] > leftMostX ) { break; } 
                    else { datumIndex ++; }
                }
                buffer = buffer.slice(datumIndex);
            }
        }
    }

    addSeries({name="",lineColor="rgb(0,0,0)",lineThickness=2,yScale=[0,1]}={}) {
        this.series.push({"name":name,"yScale":yScale, "dataBuffer": [[this.startX, 0]], 
            "lastMove":[0,0],});
        let newSeries = this.series[this.series.length-1];

        newSeries.canvasElement = document.createElement("canvas");
        newSeries.canvasElement.style.position = "absolute";
        this.intermediateElement.appendChild(newSeries.canvasElement); 
        newSeries.context = newSeries.canvasElement.getContext("2d");
        setTimeout(()=>{newSeries.context.strokeStyle=lineColor; newSeries.context.lineWidth=lineThickness;}, 50);
        newSeries.canvasElement.background = "transparent";
        newSeries.canvasElement.id="jog-canvas-" + new Date().getTime().toString();

        newSeries.canvasElement.width = this.containerElement.offsetWidth * (this.minDataBufferSize + this.graphRefreshShiftLength);
        newSeries.canvasElement.style.width = newSeries.canvasElement.width + "px";

        newSeries.canvasElement.height = this.containerElement.offsetHeight;
        newSeries.canvasElement.style.height = newSeries.canvasElement.height + "px";

        newSeries.canvasElement.style.left=this.scrollPosition*this.containerElement.offsetWidth+"px";

        // Enable dragging on the most recent canvas only:

        let current = this.series.length-1;

        for (let i = 0; i < current; i++) {
            this.series[i].canvasElement.onmousedown = null;
            this.series[i].canvasElement.onmouseup = null;
            this.series[i].canvasElement.onmousemove = null;
        }

        newSeries.canvasElement.onmousedown=e=>{
            this.frozen = true;
            newSeries.canvasElement.style.outline="3px solid green"; 
            newSeries.canvasElement.style.outlineOffset="-3px";
        };
        
        newSeries.canvasElement.onmouseup=e=>{newSeries.canvasElement.style.outline="none";};

        newSeries.canvasElement.onmousemove=e=>{
            if ( document.querySelector('#'+newSeries.canvasElement.id+':active') ) {
                let left = (parseInt(newSeries.canvasElement.style.left.split('px')[0]) + e.movementX) + "px";
                for(let i in this.series) {
                    this.series[i].canvasElement.style.left = left;
                }
            }
        };


        // apply background only to bottom canvas:
        if(current == 0) {
            newSeries.canvasElement.style.background = this.canvasBackground;
        }

        return newSeries; // returns the new series object
    }

    setSeriesLineDash(series, fillLength, totalLength) {
        this.series[series].context.setLineDash([fillLength, totalLength]);
    }



} // end of class Jogger