



nv.models.linePlusLineWithFocusChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines1 = nv.models.line()
    , lines2 = nv.models.line()
    , lines3 = nv.models.line()
    , lines4 = nv.models.line()
    , xAxis = nv.models.axis()
    , x2Axis = nv.models.axis()
    , y1Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , y3Axis = nv.models.axis()
    , y4Axis = nv.models.axis()
    , legend = nv.models.legend()
    , brush = d3.svg.brush()
    , title = ""
    , showErrorBars = true
    ;

  var margin = {top: 30, right: 30, bottom: 30, left: 60}
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , width = null
    , height = null
    , contextChartHeight = 100
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = nv.utils.defaultColor()
    , showLegend = true
    , extent
    , brushExtent = null
    , tooltips = true
    , tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>';
      }
    , x
    , x2
    , y1
    , y2
    , y3
    , y4
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush', 'update')
    , transitionDuration = 0,
    contextChart = true
    , y1Domain = ['auto', 'auto']
    , y2Domain = ['auto', 'auto']
    ;

  lines2
    .clipEdge(true)
    ;
  lines1
    .clipEdge(true)
    ;
  lines3
    .interactive(false)
    ;
  lines4
    .interactive(false)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(5)
    ;
  y1Axis
    .orient('left')
    ;
  y2Axis
    .orient('right')
    ;
  x2Axis
    .orient('bottom')
    .tickPadding(5)
    ;
  y3Axis
    .orient('left')
    ;
  y4Axis

    .orient('right')
    ;


  legend.key( function( d ){ return d.label; } ).showDuplicates(false);

var shrinkToRequiredPoints = function( scaleAmount ){

  return function( series ){

    if(! series.values || series.values.length == 0 ) return series;

    var allowEveryXAmount = series.values.length / ((window.innerWidth - margin.left) - margin.right) ;
    allowEveryXAmount = Math.ceil(allowEveryXAmount * scaleAmount);

    var currentCounter = 0;
    var bump = false;
    var toReturn = {
      values: series.values.filter(function( value, index, values ){
        //never remove the first or last point
        if( index == 0 || index == values.length -1 )
          return true;

        //Should this point be removed ?
        if( (currentCounter++ % allowEveryXAmount) !== 0 ){
          // Is this point a peak
          if( value.y > values[index - 1].y && value.y > values[index + 1].y ){
            currentCounter--;
            return true;
          }
          // Is this point a dip
          if( value.y < values[index - 1].y && value.y < values[index + 1].y ){
            currentCounter--;
            return true;
          }
          return false;
        }
      return true;
     })
    };

    for( var i in series ){
      if( series.hasOwnProperty(i) && toReturn[i] == void(0) )
        toReturn[i] = series[i];
    }

    return toReturn;
  };
}

var seriesArrayMinMax = function( seriesArray, valueAttr ){
  var min = Infinity;
  var max = -Infinity;
  for( var i = 0; i < seriesArray.length; i++ ){
    var series = seriesArray[i];
    for( var valueId = 0; valueId < series.values.length; valueId++ ){
      if( showErrorBars && series.values[valueId].error ){
        var error = series.values[valueId].error;
        var value = series.values[valueId][valueAttr];
        var smallValue = value - error;
        var largeValue = value + error; 
      }else{
        var value = series.values[valueId][valueAttr];
        var smallValue = value;
        var largeValue = value;
      }
      if( smallValue < min )
        min = smallValue;
      if( largeValue > max )
        max = largeValue;

    }
  }

  if( min == Infinity || max == -Infinity )
    return [ 0, 1 ];

  return [ min, max ];
}

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    if (extent) {
        e.pointIndex += Math.ceil(extent[0]);
    }
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines2.x()(e.point, e.pointIndex)),
        y = (e.series.yAxis == 1 ? y1Axis : y2Axis).tickFormat()(lines2.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.label, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  //------------------------------------------------------------



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;
	
      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right;
      
      var height2;
      if( ! contextChart )
	  		height2 = 0;
      else
        height2 = contextChartHeight;
      var availableHeight1 = (height || parseInt(container.style('height')) || 400)  - margin.top - margin.bottom - height2;
      var availableHeight2 = contextChartHeight - margin2.top - margin2.bottom;

	    chart.update = function(){
         container.transition().duration(transitionDuration).call(chart);
         dispatch.update();
      };

      chart.container = this;


      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight1 / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      var dataY1 = data.filter(function(d) { return !d.disabled && d.yAxis == 1 });
      var dataY2 = data.filter(function(d) { return !d.disabled && d.yAxis == 2 }); // removed the !d.disabled clause here to fix Issue #240

	  if( dataY1.length == 0 )
         dataY1 = [ { disabled: true, values:[] } ];
         
	  if( dataY2.length == 0 )
         dataY2 = [ { disabled: true, values:[] } ];
	  
      x = lines1.xScale();
      x2 = x2Axis.scale();

      y1 = lines1.yScale();
      y2 = lines2.yScale();

      y3 = lines3.yScale();
      y4 = lines4.yScale();


      var series1 = data
        .filter(function(d) { return !d.disabled && d.yAxis == 1 })
        .map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          })
        });

      var series2 = data
        .filter(function(d) { return !d.disabled && d.yAxis == 2 })
        .map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          })
        });

      x   .range([0, availableWidth]);
      
      x2  .domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
          .range([0, availableWidth]);

      lines3.xDomain( x2.domain() );
      lines3.xRange( x2.range() );
      lines4.xDomain( x2.domain() );
      lines4.xRange( x2.range() );

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
      var g = wrap.select('g');

      var titleElement = gEnter.append('text').attr('class', 'nv-title').attr('style','text-anchor:middle; font-size: 20px;');

      gEnter.append('g').attr('class', 'nv-legendWrap');
      
      var focusEnter = gEnter.append('g').attr('class', 'nv-focus');
      focusEnter.append('g').attr('class', 'nv-x nv-axis');
      focusEnter.append('g').attr('class', 'nv-y1 nv-axis');
      if( series2.length > 0 )
        focusEnter.append('g').attr('class', 'nv-y2 nv-axis');
      focusEnter.append('g').attr('class', 'nv-barsWrap');
      focusEnter.append('g').attr('class', 'nv-linesWrap');

      var contextEnter = gEnter.append('g').attr('class', 'nv-context');
      contextEnter.append('g').attr('class', 'nv-x nv-axis');
      contextEnter.append('g').attr('class', 'nv-y1 nv-axis');
      if( series2.length > 0 )
        contextEnter.append('g').attr('class', 'nv-y2 nv-axis');
      contextEnter.append('g').attr('class', 'nv-barsWrap');
      contextEnter.append('g').attr('class', 'nv-linesWrap');
      contextEnter.append('g').attr('class', 'nv-brushBackground');
      contextEnter.append('g').attr('class', 'nv-x nv-brush');

      contextEnter
        .append( 'text' )
        .text( 'Use the handles below to zoom in on the data' )
        .attr('transform', 'translate(3, -10)')
        .attr('class', 'nv-context-text');

	  
	  container.selectAll('.nv-context').attr('opacity', contextChart ? 1:0);

	  	
      //------------------------------------------------------------


      //------------------------------------------------------------
      // Legend
      // 
      margin.top = 10;

      if (showLegend) {
        legend.width( availableWidth / 2 );

        g.select('.nv-legendWrap')
            .datum( data )
            // .datum(data.map(function(series) {
            //   series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
            //   series.key = series.originalKey + (series.yAxis == 1 ? ' (left axis)' : ' (right axis)');
            //   return series;
            // }))
          .call(legend);

          margin.top += legend.height();
          var legendOffset = 0;
      }else{
        g.select('.nv-legendWrap').datum([]).call(legend);
      }

      if( title != "" ){
        g.select('.nv-title').attr('transform', 'translate(' + (availableWidth / 2) + ',' + -margin.top + ')').text( title );
        margin.top += 30;
        legendOffset = 40;
      }      

      g.select('.nv-legendWrap')
          .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-margin.top + legendOffset) +')');

      availableHeight1 = (height || parseInt(container.style('height')) || 400)
                         - margin.top - margin.bottom - height2;

      //------------------------------------------------------------

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Context Components

      lines3
        .width(availableWidth)
        .height(availableHeight2)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 }));

      lines4
        .width(availableWidth)
        .height(availableHeight2)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 }));
      
      var smallerDataY1 = dataY1.map( shrinkToRequiredPoints(8) );
      var smallerDataY2 = dataY2.map( shrinkToRequiredPoints(8) );

      var lines3Wrap = g.select('.nv-context .nv-barsWrap')
          .datum(smallerDataY1);

      var lines4Wrap = g.select('.nv-context .nv-linesWrap')
          .datum(smallerDataY2);
          
      g.select('.nv-context')
          .attr('transform', 'translate(0,' + ( availableHeight1 + margin.bottom + margin2.top) + ')')



      lines3Wrap.transition().call(lines3);
      lines4Wrap.transition().call(lines4);

      //------------------------------------------------------------



      //------------------------------------------------------------
      // Setup Brush

      brush
        .x(x2)
        .on('brush', onBrush);

      if (brushExtent) brush.extent(brushExtent);

      var brushBG = g.select('.nv-brushBackground').selectAll('g')
          .data([brushExtent || brush.extent()])

      var brushBGenter = brushBG.enter()
          .append('g');

      brushBGenter.append('rect')
          .attr('class', 'left')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      brushBGenter.append('rect')
          .attr('class', 'right')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      var gBrush = g.select('.nv-x.nv-brush')
          .call(brush);
      gBrush.selectAll('rect')
          //.attr('y', -5)
          .attr('height', availableHeight2);
      gBrush.selectAll('.resize').append('path').attr('d', resizePath);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Secondary (Context) Axes

      x2Axis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

      g.select('.nv-context .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y3.range()[0] + ')');
      g.select('.nv-context .nv-x.nv-axis').transition()
          .call(x2Axis);


      y3Axis
        .scale(y3)
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

      g.select('.nv-context .nv-y1.nv-axis')
          .style('opacity', dataY1.length ? 1 : 0)
          .attr('transform', 'translate(0,' + x2.range()[0] + ')');
          
      g.select('.nv-context .nv-y1.nv-axis').transition()
          .call(y3Axis);
          

      y4Axis
        .scale(y4)
        .ticks( availableHeight2 / 36 )
        .tickSize(dataY1.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

      g.select('.nv-context .nv-y2.nv-axis')
          .style('opacity', dataY2.length ? 1 : 0)
          .attr('transform', 'translate(' + x2.range()[1] + ',0)');

      g.select('.nv-context .nv-y2.nv-axis').transition()
          .call(y4Axis);
          
      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('stateChange', function(newState) { 
        chart.update();
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

      //============================================================


      //============================================================
      // Functions
      //------------------------------------------------------------

      // Taken from crossfilter (http://square.github.com/crossfilter/)
      function resizePath(d) {
        var e = +(d == 'e'),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
      }


      function updateBrushBG() {
        if (!brush.empty()) brush.extent(brushExtent);
        brushBG
            .data([brush.empty() ? x2.domain() : brushExtent])
            .each(function(d,i) {
              var leftWidth = x2(d[0]) - x2.range()[0],
                  rightWidth = x2.range()[1] - x2(d[1]);
              d3.select(this).select('.left')
                .attr('width',  leftWidth < 0 ? 0 : leftWidth);

              d3.select(this).select('.right')
                .attr('x', x2(d[1]))
                .attr('width', rightWidth < 0 ? 0 : rightWidth);
            });
      }


      function onBrush() {
        brushExtent = brush.empty() ? null : brush.extent();
        extent = brush.empty() ? x2.domain() : brush.extent();


        dispatch.brush({extent: extent, brush: brush});

        updateBrushBG();


        //------------------------------------------------------------
        // Prepare Main (Focus) Bars and Lines
        
        lines1
        .width(availableWidth)
        .height(availableHeight1)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 }));


        lines2
        .width(availableWidth)
        .height(availableHeight1)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 }));

        function filterDataInRange(d,i) {
          var start = null;
          var end = null;

          // Find the start and end location of the needed variables
          for( var i = 0; i < d.values.length; i++ ){
            if( lines1.x()( d.values[i], i ) >= extent[0] && start == null )
              start = i;

            if( lines1.x()( d.values[i], i ) <= extent[1]  )
              end = i;
          }

          // Add 2 extra points so that our lines go the end
          if( start != 0 ) start--;
          if( (end + 1) < d.values.length ) end++;

          var toReturn = {
            values: d.values.slice( start, end + 1 )
          }

          for( var i in d ){
            if( d.hasOwnProperty(i) && toReturn[i] == void(0) )
              toReturn[i] = d[i];
          }
          return toReturn;
        }

        var dataY1InRange = dataY1.map( filterDataInRange ).map( shrinkToRequiredPoints(4) );

        var dataY2InRange = dataY2.map( filterDataInRange ).map( shrinkToRequiredPoints(4) );

        var focusLines1Wrap = g.select('.nv-focus .nv-barsWrap')
            .datum( dataY1InRange );
        
        var focusLines2Wrap = g.select('.nv-focus .nv-linesWrap')
            .datum( dataY2InRange );

        //------------------------------------------------------------
        
        
        //------------------------------------------------------------
        // Update Main (Focus) X Axis

        if (dataY1.length) {
            x = lines1.xScale();
        } else {
            x = lines2.xScale();
        }
        
        xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight1, 0);

        xAxis.domain([Math.ceil(extent[0]), Math.floor(extent[1])]);


        lines1.xDomain( x.domain() );
        lines1.xRange( x.range() );
        lines2.xDomain( x.domain() );
        lines2.xRange( x.range() );
        
        g.select('.nv-x.nv-axis').transition().duration(transitionDuration)
          .call(xAxis);
        //------------------------------------------------------------
        
        
        //------------------------------------------------------------
        
          
        //------------------------------------------------------------
        // Setup and Update Main (Focus) Y Axes
        
        g.select('.nv-focus .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + availableHeight1 + ')');


        //Set the domain based on user specified or auto
        var y1DataDomain = seriesArrayMinMax( dataY1InRange, "y" );
        var newY1Domain = [
          typeof y1Domain[0] == 'number' ? y1Domain[0] : y1DataDomain[0],
          typeof y1Domain[1] == 'number' ? y1Domain[1] : y1DataDomain[1]
        ];
        y1.domain( y1Domain );

        //Set the domain based on user specified or auto
        var y2DataDomain = seriesArrayMinMax( dataY2InRange, "y" );
        var newY2Domain = [
          typeof y2Domain[0] == 'number' ? y2Domain[0] : y2DataDomain[0],
          typeof y2Domain[1] == 'number' ? y2Domain[1] : y2DataDomain[1]
        ];

        y1.domain( newY1Domain );
        y2.domain( newY2Domain );

        lines1.yDomain( y1.domain() );
        //lines1.yRange( y1.range() );
        lines2.yDomain( y2.domain() );
        //lines2.yRange( y2.range() );

        y1Axis
        .scale(y1)
        .ticks( availableHeight1 / 36 )
        .tickSize(-availableWidth, 0);

        g.select('.nv-focus .nv-y1.nv-axis')
          .style('opacity', dataY1.length ? 1 : 0);


        y2Axis
        .scale(y2)
        .ticks( availableHeight1 / 36 )
        .tickSize(dataY1.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none


        //------------------------------------------------------------
        // Update Main (Focus) Bars and Lines

        focusLines1Wrap.transition().duration(transitionDuration).call(lines1);
        focusLines2Wrap.transition().duration(transitionDuration).call(lines2);
        

        g.select('.nv-focus .nv-y2.nv-axis')
          .style('opacity', dataY2.length ? 1 : 0)
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

        g.select('.nv-focus .nv-y1.nv-axis').transition().duration(transitionDuration)
            .call(y1Axis);
        g.select('.nv-focus .nv-y2.nv-axis').transition().duration(transitionDuration)
            .call(y2Axis);
      }

      //============================================================

      onBrush();

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines1.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines1.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  lines2.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines2.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.lines1 = lines1;
  chart.lines2 = lines2;
  chart.lines3 = lines3;
  chart.lines4 = lines4;
  chart.xAxis = xAxis;
  chart.x2Axis = x2Axis;
  chart.y1Axis = y1Axis;
  chart.y2Axis = y2Axis;
  chart.y3Axis = y3Axis;
  chart.y4Axis = y4Axis;

  d3.rebind(chart, lines2, 'defined', 'size', 'clipVoronoi', 'interpolate');
  //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  d3.rebind(chart, dispatch, "on", "update");

  chart.options = nv.utils.optionsFunc.bind(chart);
  

  chart.y1Domain = function(_) {
    if (!arguments.length) return y1Domain;
    //Convert any numberish strings to Numbers
    y1Domain = _.map(function( val ){
      if( ! isNaN( Number( val ) ) )
        return Number(val);
      else
        return val;
    });
    return chart;
  };
  
  chart.y2Domain = function(_) {
    if (!arguments.length) return y2Domain;
    //Convert any numberish strings to Numbers
    y2Domain = _.map(function( val ){
      if( ! isNaN( Number( val ) ) )
        return Number(val);
      else
        return val;
    });;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines1.x(_);
    lines2.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines1.y(_);
    lines2.y(_);
    return chart;
  };

  chart.showErrorBars = function(_) {
    if (!arguments.length) return showErrorBars;
    showErrorBars = _;
    lines1.showErrorBars(_);
    lines2.showErrorBars(_);
    lines3.showErrorBars(_);
    lines4.showErrorBars(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };


  chart.title = function(_) {
    if (!arguments.length) return title;
    title = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.brushExtent = function(_) {
    if (!arguments.length) return brushExtent;
    brushExtent = _;
    return chart;
  };

  chart.contextChart = function(_) {
    if (!arguments.length) return contextChart;
    contextChart = _;
    return chart;
  };

  //============================================================


  return chart;
}
