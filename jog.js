class Jogger {

    constructor(dimension_settings, 
                control_settings, 
                style_settings, 
                document_settings,
                series=[],
            ){


        function fillParamDefaults(param, defaultObj) {
            if(param) {
                for (let key in defaultObj) {
                    if (param[key] == undefined) {
                        param[key] == defaultObj[key];
                    }
                }
            } else {
                param = defaultObj;
            }
            return param;
        }

        dimension_settings = fillParamDefaults(dimension_settings, {
            startWidth:400, 
            startHeight:100,
            xScale:10, 
            yGrowHysteresis:2, 
            yShrinkHysteresis:0.5,
        });

        control_settings = fillParamDefaults(control_settings, {
            scrollRate:1,
            startTime:new Date().getTime(),
            startX:0,
            dataBufferSize:1000,
            scrollUpdateInterval:50,
        });

        style_settings = fillParamDefaults(style_settings, {
            backgroundColor:"white",
            canvasBackground:"linear-gradient(to left, blue, red)", 
            margin:"0px",
        });

        document_settings = fillParamDefaults(document_settings, {
            containerId:"jog-" + new Date().getTime().toString(),  
            resizeDetectInterval:100,
        });

        

        // DOCUMENT
        this.containerElement = document.createElement("div");
        this.intermediateElement = document.createElement("div");
        this.containerElement.appendChild(this.intermediateElement);

        this.containerElement.style.position = "relative";
        this.intermediateElement.style.overflow = "hidden";
        this.intermediateElement.style.position = "relative";

        this.containerElement.id = document_settings.containerId;
        this.containerElement.style.width = dimension_settings.startWidth.toString() + "px";
        this.containerElement.style.height = dimension_settings.startHeight.toString() + "px";
        this.intermediateElement.style.width = this.containerElement.style.width;
        this.intermediateElement.style.height = this.containerElement.style.height;

        this.canvasBackground = style_settings.canvasBackground;

        // SCALE
        this.xScale = dimension_settings.xScale;
        this.yGrowHysteresis = dimension_settings.yGrowHysteresis;
        this.yShrinkHysteresis = dimension_settings.yShrinkHysteresis;
        this.resizeDetectInterval = document_settings.resizeDetectInterval;

        // CONTROL
        this.scrollRate = control_settings.scrollRate;
        this.scrollUpdateInterval = control_settings.scrollUpdateInterval;
        this.startX = control_settings.startX;
        this.startTime = control_settings.startTime;
        this.scrolledX = 0;
        this.timeDelta = new Date().getTime() - control_settings.startTime;
        this.dataBufferSize = control_settings.dataBufferSize;
        this.mostRecentlyRenderedDatumX = 0;

        // STYLE
        this.containerElement.style.backgroundColor = style_settings.backgroundColor;
        this.containerElement.style.margin = style_settings.margin;

        // SERIES
        this.series=series;

        // ENABLE SCROLLING
        this.scrollTimer = setInterval(()=>{
            this.scrolledX += this.scrollRate * this.scrollUpdateInterval / 1000 / this.xScale;
            if(!document.querySelector('#'+this.series[this.series.length-1].canvasElement.id+':active')) {
                this.scrollForwardTo(this.scrolledX);
            }
        }, this.scrollUpdateInterval);
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
        let cLastMove = [lastMove[0] * wNow, (1-lastMove[1]) * hNow];
        ctx.moveTo(cLastMove[0], cLastMove[1]);
        var cX = normX * wNow;
        var cY = (1 - normY) * hNow;
        let midpointX = ((lastMove[0] + normX)/2)*wNow;
        let controlPoints = [ [midpointX, lastMove[1]*hNow], [midpointX, cY] ];
        ctx.bezierCurveTo(controlPoints[0][0], controlPoints[0][1], controlPoints[1][0], controlPoints[1][1], cX , cY);
        ctx.stroke();
        this.series[series].lastMove = [normX, normY];
    }

    // scroll such that right edge of the viewing window is normX viewing window widths from the start.
    scrollForwardTo(normX) {
        let newMargin = (1-normX) * this.series[0].canvasElement.offsetWidth.toString() + "px";
        for(let i in this.series) {
            this.series[i].canvasElement.style.left = newMargin;
        }
    }


    // scroll such that left edge of the viewing window is normX viewing window widths from the start.
    scrollBackwardTo(normX) {
        let newMargin = -1 * normX * this.series[0].canvasElement.offsetWidth.toString() + "px";
        for(let i in this.series) {
            series[i].canvasElement.style.left = newMargin;
        }
    }

    // TODO - this doesn't take into account yScale(s)
    pushDatum(series, x, y) {
        this.series[series].dataBuffer.push([x, y]);
        if(x < this.mostRecentlyRenderedDatumX) {
            this.redrawCanvas();
        } else if (x < this.scrolledX + this.startX) {
            this.drawLineTo(series, x - this.startX, y);
            this.mostRecentlyRenderedDatumX = x;
        }
    }

    addSeries({name="",lineColor="rgb(0,0,0)",lineThickness="2px",yScale=[0,1]}={}) {
        this.series.push({"name":name,"yScale":yScale, "dataBuffer": [[this.startX, 0]], 
            "lastMove":[this.startX,0],});
        let newSeries = this.series[this.series.length-1];

        newSeries.canvasElement = document.createElement("canvas");
        newSeries.canvasElement.style.position = "absolute";
        this.intermediateElement.appendChild(newSeries.canvasElement); 
        newSeries.context = newSeries.canvasElement.getContext("2d");
        setTimeout(()=>{newSeries.context.strokeStyle=lineColor; newSeries.context.lineWidth=lineThickness;}, 50);
        newSeries.canvasElement.background = "transparent";
        newSeries.canvasElement.id="jog-canvas-" + new Date().getTime().toString();

        if (this.scrolledX > 1) {
            newSeries.canvasElement.width = this.containerElement.offsetWidth * this.scrolledX;
        } else {
            newSeries.canvasElement.width = this.containerElement.offsetWidth;
        }

        newSeries.canvasElement.style.width = newSeries.canvasElement.width + "px";
        newSeries.canvasElement.height = this.containerElement.offsetHeight;
        newSeries.canvasElement.style.height = newSeries.canvasElement.height + "px";
        newSeries.canvasElement.style.left=this.scrolledX*this.containerElement.offsetHeight+"px";

        // Enable dragging on the most recent canvas only:

        let current = this.series.length-1;

        for (let i = 0; i < current; i++) {
            this.series[i].canvasElement.onmousedown = null;
            this.series[i].canvasElement.onmouseup = null;
            this.series[i].canvasElement.onmousemove = null;
        }

        newSeries.canvasElement.onmousedown=e=>{
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

    refreshData(series, x, y) {

    }

    redrawCanvas() {

    }


} // end of class Jogger