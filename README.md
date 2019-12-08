#jogJS
A lighter-weight library for real-time graphing of streaming data using canvas.

Note: despite typical "best practice" of rendering canvases offscreen and updating a copy onscreen as an image, and of rounding pixel values to avoid anti-aliasing load, it was found by comparing profiles that rendering directly to the onscreen canvas with no rounding is far more performant.

===
## CLASS 
Jogger

### MEMBERS: 
xScale
yScale
yGrowHysteresis
yShrinkHysteresis
scrollRate
startTime
dataBuffer
lineColors
lineThickness
lineStyles
backgroundColor
resizeDetectTimeout
containerElement
canvasElement
ctx


###CONSTRUCTOR PARAMS 
####dimension_settings, control_settings, style_settings, document_settings

**DIMENSION**
 - xScale is a single number representing how many x units to show in the windowSize. Defaults to 10000 (for milliseconds). 
 - yGrowHysteresis is the number of most recent x frames used to determine the y scale as it grows to accomodate new out-of-range data. A value of "all" uses the entire history as a running average, and a value of "screen" uses all the data on the screen.
 - yShrinkHysteresis is the portion of the screen used to determine the y scale as it shrinks to accomodate data that is undersized for the current yScale range.
 - resizeDetectInterval gives milliseconds between checks for element resizing. Not used yet, but may be used to adjust x scaling to changing container size. For now, x scaling is static relative to the container size at time of initialization.

**CONTROL**
 - scrollRate is the ratio of x units to seconds - default is 1000 (milliseconds per second for an x unit of ms). Only change this if not a live view (using an x unit that is not seconds).
 - startX is the x value corresponding to the leftmost graphed point of the series (not necessarily a data point, just where the graph starts).
 - scrolledX is the "timekeeper" that keeps track of current scrolling position.
 - timeDelta is the difference in time from the plot initialization to the startTime of the series (in the case of non-live data) for axis labeling purposes.
 - scrollUpdateInterval is the update interval in milliseconds of the scrolling display. Default is 50 (1/20 second -> 20fps update).
 - startTime is the UTC timestamp corresponding to the leftmost graphed point of the series.
 - dataBufferSize is the length of the series data buffers in x units.
 - mostRecentlyRenderedDatumX is the x value of the most recently rendered data point. Points are not rendered until their X value has been scrolled to, so this might not be the most recently ingested X.


**STYLE**
Each is an array of items in order corresponding to the (perhaps multiple) data series. Items should be specified as CSS strings.
 - backgroundColor defaults to white
 - margin gives the margin around the container element.
 - padding defines the space around the plot area.


**DOCUMENT**
 - containerElement - the div containing the canvas (the outer "window" of the chart)
 - canvasElement - the canvas element on which graphs are drawn


**SERIES** 
An array of settings objects for settings that vary within between series. Multiple series enable plotting multiple variables on the same plot/axes. For plots shown beside or above/below one another, separate Jogger objects should be initialized.
 - name is the title of the series and defaults to "".
 - lineColor defaults to black.
 - lineThickness defaults to "2px". 
 - lineStyle defaults to "solid" but may be dotted or dashed.
 - yScale is a list of coordinate pairs representing the different y ranges for the series. The chart will smoothly scale between these different ranges, scaling up to the [closest] fit by top of range and scaling down to [closest] fit by bottom of range. Default value is a single unit range: [[0,1]].
 - dataBuffer stores an array of data points that each have the format [xValue, yValue].
 - lastMove stores the normalized canvas location (domain and range projected onto [0,1]) of the most recently drawn point.
 - context is initialized for each series at construction on the parent Jogger object's canvas.
