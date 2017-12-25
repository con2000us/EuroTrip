
PIXI.utils.skipHello();
var app;						//pixiJS obj
var histographics, overHistographics;
var backgraphics;
var textContainer, overContainer;
var leftBound, rightBound, extra, max;
var style;
var histOverText;

function drawHisto(data){
	var timeLeft = accuData.startTime + accuData.maxTime - (new Date).getTime();
	if(timeLeft < 0){
		timeLeft = 0;
	}
	var sum = 0
	for(var i=1;i<data.hist.length;i++){
		sum += i*data.hist[i];
	}
	var preStr = "剩餘"+Math.round(timeLeft/1000)+"秒,";
	if(accuData.maxTime < 0){
		preStr = "";
	}
	$('#span_running').text(preStr+"模擬次數 : " + data.current + "    畢業期望值 : "+ Math.round(sum*1000/data.current)/1000);

	//找出資料邊界
	
	data.leftBound = 0;
	while(data.hist[data.leftBound] == 0 && data.leftBound <= data.hist.length){
		data.leftBound++;
	}

	data.rightBound = data.hist.length-1;
	extra = 0;
	while(extra * 1000 < data.current && data.rightBound >= 0){
		extra += data.hist[data.rightBound];
		data.rightBound--;
	}

	if(data.rightBound+3 >= data.hist.length){
		data.rightBound = data.hist.length-1;
	}else{
		data.rightBound += 2;
	}

	data.max = 0;
	for(var i=data.leftBound;i<=data.rightBound;i++){
		if(data.max < data.hist[i]){
			data.max = data.hist[i];
		}
	}

	while(overContainer.children.length > 0){
		overContainer.removeChild(overContainer.children[0]);
	}
	

	//histogram drawing
	histographics.clear();
	histographics.beginFill(0xF0A0A0);
	histographics.lineStyle(1, 0x303000, 1);

	var interval = data.rightBound - data.leftBound;
	var heightRatio = data.current/(data.max*1.1);
	histographics.moveTo(50,dh-50);

	var widthRatio = Math.floor(interval/dw);

	for(var i=0;i<=data.rightBound-data.leftBound;i++){
		histographics.lineTo(50+(dw-100)*i/interval,dh-50-(dh-100)*heightRatio*data.hist[i+data.leftBound]/data.current);
		i += widthRatio;
	}
	histographics.lineTo(50+(dw-100)*(data.rightBound-data.leftBound)/interval,dh-50-(dh-100)*heightRatio*data.hist[data.rightBound]/data.current);
	histographics.lineTo(50+(dw-100),dh-50);
	histographics.lineTo(50,dh-50);

	app.stage.addChild(histographics);


	while(textContainer.children.length > 0){
		textContainer.removeChild(textContainer.children[0]);
	}

	style = new PIXI.TextStyle({
		fontFamily: 'Arial',
		fontSize: 10,
		stroke: '#4a1850'
	});

	var leftBoundText = new PIXI.Text(data.leftBound+'抽', style);
	leftBoundText.x = 50;
	leftBoundText.y = dh-40;
	leftBoundText.anchor.x = 0.5;
	leftBoundText.anchor.y = 0.5;
	leftBoundText.resolution = 2;
	textContainer.addChild(leftBoundText);

	var rightBoundText = new PIXI.Text(data.rightBound+'抽', style);
	rightBoundText.x = dw-50;
	rightBoundText.y = dh-40;
	rightBoundText.anchor.x = 0.5;
	rightBoundText.anchor.y = 0.5;
	rightBoundText.resolution = 2;
	textContainer.addChild(rightBoundText);

	var maxText = new PIXI.Text(Math.round(data.max*10000/data.current)/100+'%', style);
	maxText.x = 25;
	maxText.y = 50+(dh-100)*0.1;
	maxText.anchor.x = 0.5;
	maxText.anchor.y = 0.5;
	maxText.resolution = 4;
	textContainer.addChild(maxText);	
	
	app.stage.addChild(textContainer);
}

function showResult(data){
	var sum = 0;
	for (var i = data.hist.length - 1; i >= 0; i--) {
		sum += data.hist[i]*i;
	}
	//$('#span_running').text("模擬次數 : " + data.current + "    畢業期望值 : "+ Math.round(sum*1000/data.current)/1000);
	//抽卡超過上限次數的比例過高
	if(data.hist[drawLimit]*50 > data.current){
		alert("抽卡超過上限"+drawLimit+"抽的次數 : " + Math.round(data.hist[drawLimit]*10000/data.current)/100+'%');
	}
}

var dh, dw;

$(document).ready(function() {

	dw = $('#div_resultCanvas').width();
	dh = $('#div_resultCanvas').height();
	
	app = new PIXI.Application( dw, dh, { antialias: true, transparent: true });
	$('#div_resultCanvas').get(0).appendChild(app.view);

	app.stage.interactive = true;

	histographics = new PIXI.Graphics();
	overHistographics = new PIXI.Graphics();
	backgraphics = new PIXI.Graphics();
	overBackgraphics = new PIXI.Graphics();

	textContainer = new PIXI.Container();
	overContainer = new PIXI.Container();
	lineContainer = new PIXI.Container();
	textContainer.x = 0;
	textContainer.y = 0;

	lines = new Array();
	
	//draw background	
	backgraphics.beginFill(0xF0F0FF);
	backgraphics.lineStyle(2, 0x333333, 1);
	backgraphics.moveTo(50,dh-50);
	backgraphics.lineTo(dw-50,dh-50);
	backgraphics.lineTo(dw-50,50);
	backgraphics.lineTo(50,50);
	backgraphics.lineTo(50,dh-50);
	backgraphics.interactive = false;
	app.stage.addChild(backgraphics);
	app.stage.addChild(lineContainer);

	backgraphics.mousemove = function(e) {
		drawHover(e);
	};

	backgraphics.touchstart = function(e) {
		drawHover(e);
	};

	backgraphics.touchmove = function(e) {
		drawHover(e);
	};

	$('#div_resultCanvas').hide();
});


function drawHover(e){
	var mx = e.data.global.x;
	var my = e.data.global.y;

	if(mx >= 50 && mx <= dw-50 && my >= 50 && my <= dh-50){
		var rx = mx-50;
		var ry = my-50;
		var interval = accuData.rightBound - accuData.leftBound;
		var currentUnit = Math.round(rx/(dw-100) * interval + accuData.leftBound);
		//console.log(currentUnit);

		var accuOver = 0;
		for(i=0;i<=currentUnit-accuData.leftBound;i++){
			accuOver += accuData.hist[i+accuData.leftBound];
		}
		
		overHistographics.clear();
		var colorRatio = 1-((currentUnit-accuData.leftBound)/interval);
		overHistographics.beginFill(PIXI.utils.rgb2hex([colorRatio,colorRatio,colorRatio]),0.9);
		overHistographics.lineStyle(1, 0x303030, 0.75);
		
		var heightRatio = accuData.current/(accuData.max*1.1);
		overHistographics.moveTo(50,dh-50);

		var widthRatio = Math.floor(interval/dw);

		for(var i=0;i<=currentUnit-accuData.leftBound;i++){
			overHistographics.lineTo(50+(dw-100)*i/interval,dh-50-(dh-100)*heightRatio*accuData.hist[i+accuData.leftBound]/accuData.current);
			i += widthRatio;
		}
		overHistographics.lineTo(50+(dw-100)*(currentUnit-accuData.leftBound)/interval,dh-50-(dh-100)*heightRatio*accuData.hist[accuData.rightBound]/accuData.current);
		overHistographics.lineTo(50+(dw-100)*(currentUnit-accuData.leftBound)/interval,dh-50);
		overHistographics.lineTo(50,dh-50);

		while(overContainer.children.length > 0){
			overContainer.removeChild(overContainer.children[0]);
		}

		var overStyle = new PIXI.TextStyle({
			fontSize: 15,
			fontFamily: 'Arial',
			fill: '#22aa01',
			align: 'center',
			stroke: '#FFFFFF',
			strokeThickness: 2
		});

		var histOverText = new PIXI.Text(Math.round(accuOver*10000/accuData.current)/100+'%', overStyle);
		histOverText.x = 50+(dw-100)*(currentUnit-accuData.leftBound)/interval;
		if(histOverText.x < 80){
			histOverText.x = 80;
		}

		histOverText.y = dh-70-(dh-100)*heightRatio*accuData.hist[currentUnit]/accuData.current;
		histOverText.anchor.x = 0.5;
		histOverText.anchor.y = 0;
		histOverText.resolution = 2;
		overContainer.addChild(histOverText);

		var unitOverText = new PIXI.Text(currentUnit+'抽', overStyle);
		unitOverText.x = 50+(dw-100)*(currentUnit-accuData.leftBound)/interval;
		unitOverText.y = dh-20;
		unitOverText.anchor.x = 0.5;
		unitOverText.anchor.y = 0.5;
		unitOverText.resolution = 2;
		overContainer.addChild(unitOverText);

		var gridgraphics = new PIXI.Graphics();
		gridgraphics.beginFill(0xF0F0FF,0);
		gridgraphics.lineStyle(2, 0x333333, 1);
		gridgraphics.moveTo(50,dh-50);
		gridgraphics.lineTo(dw-50,dh-50);
		gridgraphics.lineTo(dw-50,50);
		gridgraphics.lineTo(50,50);
		gridgraphics.lineTo(50,dh-50);
		overContainer.addChild(gridgraphics);

		app.stage.addChild(overHistographics);
		app.stage.addChild(overContainer);
		//app.stage.addChild(lineContainer);
	}else{
		overHistographics.clear();
		while(overContainer.children.length > 0){
			overContainer.removeChild(overContainer.children[0]);
		}
	}	
}

function getPosByPerc(prec, data){
	var precData = new Object();
	precData.prec = prec;
	precData.targetPoint = data.current*prec/100;
	var targetPoint = precData.targetPoint;
	
	if(targetPoint > data.hist[data.leftBound]){
		targetPoint -= data.hist[data.leftBound];
		for(var i=data.leftBound+1;i<data.rightBound;i++){
			if(targetPoint > data.hist[i]){
				targetPoint -= data.hist[i];
			}else{
				var diffRatio = targetPoint/((data.hist[i]+data.hist[i-1])/2);
				precData.targetPrec = i-1+diffRatio;
				precData.targetDraw = Math.round(precData.targetPrec);
				i = data.rightBound;
			}
		}
	}else{
		var diffRatio = targetPoint/data.hist[data.leftBound];
		precData.targetPrec = i-1+diffRatio;
		precData.targetDraw = Math.round(precData.targetPrec);
	}
	return precData;
}

function clearLines(){
	$.each(lineContainer.children, function(index, val) {
		lineContainer.removeChild(val);
	});
}

function detailLine(precData, lineFormat){
	var interval = accuData.rightBound - accuData.leftBound;
	var curline = new PIXI.Graphics();
	//curline.beginFill(0xFF0000,0,0);
	curline.lineStyle(lineFormat.width, lineFormat.color, lineFormat.alpha);
	curline.moveTo(50+(dw-100)*(precData.targetPrec-accuData.leftBound)/interval,50);
	curline.lineTo(50+(dw-100)*(precData.targetPrec-accuData.leftBound)/interval,dh-50);
	lineContainer.addChild(curline);

	var overStyle = new PIXI.TextStyle({
		fontSize: 11,
		fontFamily: 'Arial',
		fill: '#cc00ff',
		align: 'center',
		stroke: '#ffffff',
		strokeThickness: 2
	});
	var percText = new PIXI.Text(lineFormat.title, overStyle);
	percText.x = 50+(dw-100)*(precData.targetPrec-accuData.leftBound)/interval;
	percText.y = 35;
	percText.anchor.x = 0.5;
	percText.anchor.y = 0.5;
	percText.resolution = 2;
	curline.addChild(percText);

	var drawText = new PIXI.Text((Math.round(precData.targetPrec*10)/10)+'抽', overStyle);
	drawText.x = 50+(dw-100)*(precData.targetPrec-accuData.leftBound)/interval;
	drawText.y = dh-40;
	drawText.anchor.x = 0.5;
	drawText.anchor.y = 0.5;
	drawText.resolution = 2;
	curline.addChild(drawText);

}