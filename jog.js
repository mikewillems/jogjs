class Jogger {

    constructor(dimension_settings, 
                control_settings, 
                style_settings, 
                document_settings,
                series=[{
                    name:"", 
                    yScale:[0,1], 
                    lineColor:"rgba(0,0,0,1)", 
                    lineThickness:"2px", 
                    lineStyle: "solid", 
                    dataBuffer: [[0, 
                    new Date().getTime(), 0]], 
                    lastMove:[0,0],
                }],
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
            backgroundColor:"rgba(0,0,0,0)", 
            margin:"0px",
        });

        document_settings = fillParamDefaults(document_settings, {
            containerId:"jog-" + new Date().getTime().toString(), 
            canvasId:"jog-canvas-" + new Date().getTime().toString(), 
            resizeDetectInterval:100,
        });

        if(series == undefined) {
            series = [{},];
        }

        series[0] = fillParamDefaults(series[0], {
            name:"", 
            yScale:[0,1],
            lineColor:"rgba(0,0,0,1)", 
            lineThickness:"2px", 
            lineStyle: "solid", 
            dataBuffer: [[0, control_settings.startTime, 0]], 
            lastMove:[0,0],
        });

        // DOCUMENT
        this.containerElement = document.createElement("div");
        this.canvasElement = document.createElement("canvas");
        this.containerElement.appendChild(this.canvasElement);
        this.containerElement.style.overflow = "hidden";
        this.containerElement.id = document_settings.containerId;
        this.canvasElement.id = document_settings.canvasId;
        this.containerElement.style.width = dimension_settings.startWidth.toString() + "px";
        this.containerElement.style.height = dimension_settings.startHeight.toString() + "px";
        this.canvasElement.width = dimension_settings.startWidth;
        this.canvasElement.style.width = dimension_settings.startWidth.toString() + "px";
        this.canvasElement.height = dimension_settings.startHeight;
        this.canvasElement.style.height = dimension_settings.startHeight.toString() + "px";
        this.canvasElement.style.marginLeft="0px";

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
        this.canvasElement.style.backgroundColor = style_settings.backgroundColor;
        this.containerElement.style.margin = style_settings.margin;

        // SERIES
        this.series = series;
        if (! this.series[0].context) {
            this.series[0].context = this.canvasElement.getContext("2d"); 
            this.series[0].context.lineWidth=this.series[0].lineThickness;
        }

        // ENABLE DRAGGING
        this.canvasElement.onmousedown=e=>{this.canvasElement.style.outline="3px solid green"; this.canvasElement.style.outlineOffset="-3px";};
        this.canvasElement.onmousemove=e=>{
            if ( document.querySelector('#'+this.canvasElement.id+':active') ) {
                this.canvasElement.style.marginLeft = (parseInt(this.canvasElement.style.marginLeft.split('px')[0]) + e.movementX) + "px";
            }
        };
        this.canvasElement.onmouseup=e=>{this.canvasElement.style.outline="none";};

        // ENABLE SCROLLING
        this.scrollTimer = setInterval(()=>{
            this.scrolledX += this.scrollRate * this.scrollUpdateInterval / 1000 / this.xScale;
            if(!document.querySelector('#'+this.canvasElement.id+':active')) {
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
        // console.log("ctx.moveTo(",cX,",",cY,")");
        // console.log("storing as lastMove: (",normX,",",normY,")");
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
        this.canvasElement.style.marginLeft = (1-normX) * this.canvasElement.offsetWidth.toString() + "px";
    }


    // scroll such that left edge of the viewing window is normX viewing window widths from the start.
    scrollBackwardTo(normX) {
        this.canvasElement.style.marginLeft = -1 * normX * this.canvasElement.offsetWidth.toString() + "px";
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

    refreshData(series, x, y) {

    }

    redrawCanvas() {

    }


} // end of class Jogger