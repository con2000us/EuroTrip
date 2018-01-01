var CLIPBOARD = null;
var targetPool;			//目標池List
var targetPoolDirty;
var tablePoolDirty;
var sourceJSON;
var tableData;			//所有Item list
var prepPool;
var tablePatten;

var accuData;			//統計累積值
var timerID;
var drawLimit;			//單次抽卡次數上限

var gcount;				//index計算變數
var showResult_speed;	//抽獎顯示方式 1:動畫, 2:即時
var dataSourceType;		// 1. 從local, 2. 從file
var ImgData, ImgDataMap;
var zipJSON, zipImgProc;
var threadLock,interrupt;
var init_folded;
var mr;


$(document).ready(function() {
	mr = new MersenneTwister();
	drawLimit = 9999;
	showResult_speed = 100;
	zipImgProc = 0;
	random = function(){return Math.random()};		//亂數產生方式
	//random = function(){return mr.random()};
	tablePatten = $('#tree_container').html();
	threadLock = true;
	interrupt = false;
	init_folded = new Array();
	$('#sel_file').change(function(event) {
		if($(this).val() !== ''){
			$.when(loadData($(this).val())).then(function(){
				$('#span_running').hide();
				$('#div_resultCanvas').hide();
				$('#resultcontainerWrapper').hide();
				dataSourceType = 1;
				targetPool = new Array();
				
				refreshContainer(targetPool);
				reloadTree();

				var tree = $("#tree").fancytree("getTree");
				tableData = new Array();
				gcount = 0;
				getList(tableData, "root", tree.rootNode, 0);

				ImgData = new Array();
				ImgDataMap = new Array();
				promises = new Array();				
				$.each(tableData, function(index, val) {
					if(val.exp == 'n' && val.img !== null){
						promises[index] = getURL(val.img, function(dataUrl) {
							imgObj = new Object();
							imgObj.title = val.title;
							imgObj.url = val.img;
							imgObj.b64 = dataUrl;
							ImgDataMap[imgObj.url] = ImgData.length;
							ImgData.push(imgObj);
						});
					}
				});

				Promise.all(promises).then(function(results){
					$('#btn_par').trigger('click');
				});
							
			});
		}
	});
	
	$("#file").on("change", function(evt) {
		// Closure to capture the file information.
		dataSourceType = 2;
		function handleFile(f) {
			var deferred = $.Deferred();
			zipJSON = null;
			ImgData = new Array();
			ImgDataMap = new Array();
			JSZip.loadAsync(f)
			.then(function(zip) {
				zip.forEach(function (relativePath, zipEntry){  
					if(zipEntry.name == 'data.json'){
						zipJSON = zipEntry;
					}
					if(zipEntry.name.match(/(.png)$/g)){
						imgObj = new Object();
						imgObj.url = zipEntry.name;
						imgObj.entry = zipEntry;
						ImgDataMap[imgObj.url] = ImgData.length;
						ImgData.push(imgObj);
						zipImgProc++;
					}
				});

				if(zipJSON === null){
					deferred.reject();
				}

				$.each(ImgData, function(index, val) {
					val.entry.async("base64").then(function (b64) {
						val.b64 = "data:image/png;base64," + b64;
						zipImgProc--;
						if(zipImgProc == 0){
							//$result.append(makeImgfromBase64(ImgData[1].b64));							
							zipJSON.async("string").then(function (text) {
								sourceJSON = text;
								deferred.resolve();
							});
						}else{
							deferred.notify(val.entry);
						}
					});
				});

			}, function (e) {

			});
			return deferred.promise();
		}
		$.when(handleFile(evt.target.files[0])).then(function(){		//unzip finished
			sourceJSON = eval(sourceJSON);
			reloadTree();
			targetPool = new Array();
			refreshContainer(targetPool);
			$('#btn_par').trigger('click');
		},function(){
			console.log('沒有Json檔案');								//json data missing...
		},function(entry){
			//console.log(entry.name);
			//console.log((ImgData.length-zipImgProc)+'/'+ImgData.length);									//on going
		});
	});

	$('#btn_newJson').click(function(event) {
		var curJSON = getJsonTree($("#tree").fancytree("getTree").rootNode,true).children

		$('#pre_JSONinput').text(JSON.stringify(curJSON, null, 3));
		$('#showJson').dialog({
			height: 500,
			width: 900,
			title: 'JSON資料欄',
			resizable: true,
			draggable: true,
			modal: true,
			buttons: {
				完成: function() {
					sourceJSON = eval($('#pre_JSONinput').text());
					dataSourceType = 2;
					reloadTree();
					targetPool = new Array();
					refreshContainer(targetPool);
					$(this).dialog("close");
				}
			}
		});
	});

	$('#sel_file').val('newyear.json');

	$.when(loadData($('#sel_file').val())).then(function(){
		dataSourceType = 1;
		targetPool = new Array();
		
		init_json();
		event_binding();
		refreshContainer(targetPool);
		
		$('#span_running').hide();
		$('#div_resultCanvas').hide();
		$('#resultcontainerWrapper').hide();
	});
	setInterval(function(){normalize()}, 300);
});


function loadData(jsonfile){
	var deferred = $.Deferred(); 
	$.getJSON(jsonfile, function(json) {
		sourceJSON = json;
		deferred.resolve();
	});
	return deferred.promise();
}

function init_json(){
	tableData = new Array();
	targetPool = new Array();
	ImgDataMap = new Array();

	treeSetup();
	$("#tree").children('ul').eq(0).css("border","none");
	var tree = $("#tree").fancytree("getTree");
	tableData = new Array();
	gcount = 0;
	getList(tableData, "root", tree.rootNode, 0);

	if(dataSourceType == 1){
		ImgData = new Array();
		promises = new Array();
		$.each(tableData, function(index, val) {
			if(val.exp == 'n' && val.img !== null){
				promises[index] = getURL(val.img, function(dataUrl) {
					imgObj = new Object();
					imgObj.title = val.title;
					imgObj.url = val.img;
					imgObj.b64 = dataUrl;
					ImgDataMap[imgObj.url] = ImgData.length;
					ImgData.push(imgObj);
				})
			}
		});
	}
	prepPool = lotteryPrep(tableData);
	Promise.all(promises).then(function(results){
		$('#btn_par').trigger('click');
	});
}

function reloadTree(){
	var tree = $('#tree');
	tree.remove();
	$('#tree_container').html(tablePatten);
	treeSetup();	
}

function event_binding(){	

	$('#btn_clearTarget').click(function(event) {
		targetPool = new Array();
		interrupt = true;
		refreshContainer(targetPool);
	});

	$('#btn_par').click(function(event) {
		prepPool = lotteryPrep(tableData);
		targetPool = new Array();
		interrupt = true;
		for(var i=0;i<prepPool.length;i++){
			var w = parseFloat($('#input_w'+prepPool[i].key).val());
			if(w == 0 || isNaN(w)){
				$("#showResult").text('項目：'+prepPool[i].title+' 權重設定有誤');
				$("#showResult").dialog({
					modal: true,
					title: '提示',
					buttons: {
						Ok: function() {
							$( this ).dialog( "close" );
						}
					}
				});
				return;
			}
		}
		$.each(prepPool, function(index, val) {
			addPool(val, 'copy');
		});
		refreshContainer(targetPool);		
	});

	$('#btn_newItem').click(function(event) {
		var node = $("#tree").fancytree("getActiveNode");
		if(node){
			node.editCreateNode("after", "");
		}else{
			node = $("#tree").fancytree("getRootNode");
			node.editCreateNode("child", "");
			var newNode = $("#tree").fancytree("getActiveNode");
		}
		reloadTableData();
	});

	$('#btn_newFolder').click(function(event) {
		var node = $("#tree").fancytree("getActiveNode");
		if(node){
			node.editCreateNode("after", {title: "", folder: true });
		}else{
			node = $("#tree").fancytree("getRootNode");
			node.editCreateNode("child", {title: "", folder: true });
		}
		reloadTableData();
	});

	$('#btn_pick').click(function(event) {
		if(targetPool.length == 0){
			return;
		}
		$(this).prop('disabled',true);
		$('#btn_histo').prop('disabled',true);
		$('#span_running').hide();
		$('#div_resultCanvas').hide();
		$('#resultcontainerWrapper').show();
		reloadTableData();
		prepPool = lotteryPrep(tableData);

		$('#resultcontainer > .div_item').remove();

		if(targetPool.length > 0){
			var sum = 0;
			var tryNum = 0;
			var result = new Array();
			var wrapper_bottom, wh;
			prepMatch();
			while(sum < targetPool.length && tryNum < drawLimit){
				out = single_pick(prepPool);
				match = targetMatch(out,prepPool);
				result.push({"node":out,"match":match});
				sum += match;
				tryNum++;
			}
			$('#resultcontainerWrapper').show();
			// 時差顯示
			showPickAnim(result, sum, 0, showResult_speed);	

			wrapper_bottom = $('#resultcontainerWrapper').position().top + $('#resultcontainerWrapper').height();
			wh = window.innerHeight || document.body.clientHeight;
			$('html, body').animate({scrollTop: wrapper_bottom-wh+120}, 1000);
		}
	});

	$('#btn_histo').click(function(event) {
		if(targetPool.length == 0){
			return;
		}
		clearLines();
		if(accuData != null && accuData.maxTime < 0){
			clearTimeout(timerID);
			accuData.maxTime = 0;
			backgraphics.interactive = true;
			$(this).text('模擬Go');
			$('#btn_pick').prop('disabled', false);
			
			var pc = getPosByPerc(50,accuData);
			detailLine(pc,{'title':'50%世界線','width':1,'color':0xFF3030,'alpha':0.25});
			return;				
		}
		$(this).text('模擬結束');
		$('#btn_pick').prop('disabled', true);
		$('#span_running').show();
		$('#div_resultCanvas').show();
		$('#resultcontainerWrapper').hide();
		
		backgraphics.interactive = false;
		prepPool = lotteryPrep(tableData);

		accuData = new Object();
		accuData.limit = drawLimit;
		accuData.hist = new Array();
		accuData.current = 0;
		accuData.startTime = (new Date).getTime();
		accuData.max = 20000;
		accuData.maxTime = -1;
		
		accuData.stopType = 'time';			//time / repeat

		for(var i=0;i<=accuData.limit;i++){
			accuData.hist[i] = 0;
		}
		threadLock = false;
		interrupt = false;
		timerID = window.setInterval(slice_hist, 120,100,2000);
	});

}

function treeSetup(){
	// $('#tree').unbind('nodeCommand');
	// $('#tree').unbind('keydown');
	
	$("#tree").fancytree({
		checkbox: false,
		titlesTabbable: true,     // Add all node titles to TAB chain
		quicksearch: true,        // Jump to nodes when pressing first character
		source: sourceJSON,
		//source: testdata,
		extensions: ["edit", "dnd", "table", "gridnav"],
		dnd: {
			preventVoidMoves: true,
			preventRecursiveMoves: true,
			autoExpandMS: 400,
			dragStart: function(node, data) {
				return true;
			},
			dragEnter: function(node, data) {
				// return ["before", "after"];
				if(node.folder){
					return true;	
				}else{
					return ["before", "after"];
				}
				
			},
			dragDrop: function(node, data) {
				data.otherNode.moveTo(node, data.hitMode);
				targetPool = new Array();
				refreshContainer(targetPool);
				reloadTableData();
			}
		},
		edit: {
			triggerStart: ["f2", "shift+click", "mac+enter"],
			close: function(event, data) {
				if( data.save && data.isNew ){
					// Quick-enter: add new nodes until we hit [enter] on an empty title
					$("#tree").trigger("nodeCommand", {cmd: "addSibling"});
				}
			}
		},
		table: {
			indentation: 20,
			nodeColumnIdx: 1,
			checkboxColumnIdx: 0
		},
		gridnav: {
			autofocusInput: false,
			handleCursorKeys: true
		},
		createNode: function(event, data) {
			var node = data.node,
			$tdList = $(node.tr).find(">td");

			// Span the remaining columns if it's a folder.
			// We can do this in createNode instead of renderColumns, because
			// the `isFolder` status is unlikely to change later
			// if(node.isFolder() ) {
			// 	// $tdList.eq(2)
			// 	// .prop("colspan", 6)
			// 	// .nextAll().remove();
			// 	$tdList.eq(2).text("");
			// 	$tdList.eq(3).text("");
			// }
			var $select = $tdList.eq(4).children().eq(0);
			
			$select.prop('id','sel_op'+node.key);
			$select.attr('key',node.key);

			$select.change(node.key, function(event) {
				sel_op(event.data);
			});
			$tdList.click($select,function(event) {
				$tdList.trigger('mouseover',$select);
			});

			$tdList.mouseover($select,function(event) {					
				$.each(tableData, function(index, val) {
					if(val.key != $select.attr("key")){
						$('#sel_op'+val.key).hide();
					}
				});		
				event.data.show();		
			});
			if(node.data.init_folded){
				init_folded.push(node);
			}

			reloadTableData();
		},
		renderColumns: function(event, data) {
			var node = data.node,
			$tdList = $(node.tr).find(">td");

			var $select = $tdList.eq(4).children().eq(0);
			$select.hide();
			// (Index #0 is rendered by fancytree by adding the checkbox)
			if(!node.folder){
				if(!node.data.w){
					node.data.w = 0;
				}
				$tdList.eq(2).html('<input type="input" class="input_data" id= "input_w'+node.key+'" img="'+node.data.img+'" value="' + node.data.w + '" size=\"3\">');
				$tdList.eq(3).html('<span id="span_p'+node.key+'" class="span_p">0</span>%');

			}
			
		}	
	}).on("nodeCommand", function(event, data){
		// Custom event handler that is triggered by keydown-handler and
		// context menu:
		treeNode_command(data.cmd);
	// }).on("click dblclick", function(e){
	//   console.log( e, $.ui.fancytree.eventToString(e) );

	}).on("keydown", function(e){
		var cmd = null;

		// console.log(e.type, $.ui.fancytree.eventToString(e));
		switch( $.ui.fancytree.eventToString(e) ) {
			case "a":
				cmd = "addpool";
				break;
			case "d": 
				cmd = "removeItem";
				break;
			case "i":
				cmd = "showItemInfo";
			break;
			case "r":
				cmd = "remove";
			break;
		}
		if( cmd ){
			$(this).trigger("nodeCommand", {cmd: cmd});
			// e.preventDefault();
			// e.stopPropagation();
			return false;
		}
	});

	$("#tree").contextmenu({
		delegate: "span.fancytree-node",
		menu: [
			{title: "加入目標池 <kbd>[A]</kbd>", cmd: "addpool", uiIcon: "ui-icon-plus" },
			{title: "移出目標池 <kbd>[D]</kbd>", cmd: "removeItem", uiIcon: "ui-icon-minus" },
			{title: "----"},
			//{title: "項目資訊 <kbd>[I]</kbd>", cmd: "showItemInfo", uiIcon: "ui-icon-pencil" },
			{title: "刪除項目 <kbd>[R]</kbd>", cmd: "remove", uiIcon: "ui-icon-trash" }
		],
		beforeOpen: function(event, ui) {
			var node = $.ui.fancytree.getNode(ui.target);
			$("#tree").contextmenu("enableEntry", "paste", !!CLIPBOARD);
			node.setActive();
		},
		select: function(event, ui) {
			var that = this;
			// delay the event, so the menu can close and the click event does
			// not interfere with the edit control
			setTimeout(function(){
				$(that).trigger("nodeCommand", {cmd: ui.cmd});
			}, 100);
		}
	});

	$.each(init_folded, function(index, val) {
		val.setExpanded(false);
	});
}


function getList(arrayData, parent, node, level){	
	if(node.children != null || node.folder){
		
		var min = gcount;

		if(node.children){
			for(var i=0;i<node.children.length;i++){
				getList(arrayData, node, node.children[i], level+1);
			}
		}

		if(node.key == 'root_1'){
			return;
		}

		//可重複計算的分類
		tempfolder = new Object();
		tempfolder.min = min;
		tempfolder.max = gcount-1;
		tempfolder.exp = "y";
		tempfolder.parent = parent;
		tempfolder.title = node.title;
		tempfolder.level = level;
		tempfolder.node = node;
		tempfolder.key = node.key;
		tempfolder.duplicate = 'y';

		arrayData.push(tempfolder);

		//不可重複計算的分類
		tempfolder = new Object();
		tempfolder.min = min;
		tempfolder.max = gcount-1;
		tempfolder.exp = "y";
		tempfolder.parent = parent;
		tempfolder.title = node.title;
		tempfolder.level = level;
		tempfolder.node = node;
		tempfolder.key = node.key;
		tempfolder.duplicate = 'n';
		arrayData.push(tempfolder);

	}else{
		temp = new Object();
		temp.exp = "n";
		temp.parent = parent;
		temp.title = node.title;
		temp.level = level;
		temp.node = node;
		temp.key = node.key;
		temp.min = gcount;
		temp.max = gcount;
		gcount++;
		temp.w = parseFloat($('#input_w'+node.key).val());
		temp.img = $('#input_w'+node.key).attr("img");
		arrayData.push(temp);
	}
}

function getJsonTree(node,root){
	var json = new Object();
	if(!root){
		json.title = node.title;
	}

	if(node.data !== null){
		if(node.data.img != undefined){
			json.img = node.data.img;
		}
		if(node.data.w != undefined){
			json.w = parseFloat($('#input_w'+node.key).val());
		}
	}
	
	if(node.children !== null && node.children.length > 0){
		json.expanded = true;
		json.folder = true;
		json.children = new Array();
		for(var i=0;i<node.children.length;i++){
			json.children.push(getJsonTree(node.children[i],false));
		}
	}
	return json;
}

function normalize(){
	var total;
	total = 0;
	$.each(tableData, function(index, val) {
		if(val.exp == 'n'){
			if(!isNaN(parseFloat($('#input_w'+val.key).val()))){
				total += parseFloat($('#input_w'+val.key).val());
			}
		}
	});

	$.each(tableData, function(index, val) {
		if(val.exp == 'n'){
			var w = parseFloat($('#input_w'+val.key).val());
			if(isNaN(w)){
				w = 0;
			}
			$('#span_p'+val.key).text(Math.round(w/total*10000)/100);
			$('#span_p'+val.key).attr("pp",w/total*100);
		}
	});
}

// 加入目標池
function addPool(obj, addType){		// addType : dup(重複計算) / uni(不可重複)
	
	if(obj.max - obj.min < 0){
		alert('無法加入空分類');
		return;
	}

	var node = jQuery.extend({}, obj);
	node.addType = addType;
	if(!node.node.folder){
		node.addType = 'copy';
	}

	//確認條件是否互斥 true: 可加內容/ false:不可加(有互斥)
	var exc = poolCheck(node, targetPool);

	if(!exc){
		alert('不合邏輯，無法增加'+node.title);
		return;
	}

	insertToPool(node, targetPool);

}

function insertToPool(node, pool){
	var counter = 0;
	if(node.title == "root"){
		return;
	}
	if(pool.length > 0){
		do{
			if(counter >= pool.length){
				break;
			}
			if(node.level > pool[counter].level){
				break;
			}
			if(node.level == pool[counter].level && parseFloat(node.min) < parseFloat(pool[counter].min)){
				break;
			}
			if(node.level == pool[counter].level && parseFloat(node.min) == parseFloat(pool[counter].min)){
				if(node.addType == 'copy'){
					break;	
				}
			}

			counter++;
		}while(true);
		pool.splice(counter, 0, node);
	}else{
		pool.push(node)	;
	}
}

function removeFromPool(node){
	var counter = 0;
	while(counter < targetPool.length && targetPool[counter].key != node.key){
		counter++;
	}
	if(counter < targetPool.length){
		targetPool.splice(counter,1);
	}
}

function makeImgfromBase64(b64){
	$zimg = $('<img>');
	$zimg.attr("src","data:image/png;base64, "+b64);
	return $zimg;
}

function makeItemURL(node, extClass){
	var htmlStr = "";
	htmlStr += '<div class="div_item" key="'+node.key+'" title="'+node.title+'">';
	//htmlStr += '	<img class ="img_item '+extClass+'" src="'+node.img+'" alt="'+node.title+'">';
	if(node.exp == 'y'){
		htmlStr += '	<img class ="img_item '+extClass+'" src="img/folder-icon.png" alt="'+node.title+'">';
	}else if(ImgData[ImgDataMap[node.img]] == null || ImgData[ImgDataMap[node.img]].b64 == null){		
		htmlStr += '	<img class ="img_item '+extClass+'" src="img/undefined.png" alt="'+node.title+'">';
	}else{
		htmlStr += '	<img class ="img_item '+extClass+'" src="'+ImgData[ImgDataMap[node.img]].b64+'" alt="'+node.title+'">';
	}
	//htmlStr += '	<span class="span_itemName">'+node.title+Array(longestStr-node.title.length+1).join('　')+'</span>';
	htmlStr += '	<span class="span_itemName">'+node.title+'</span>';
	htmlStr += '</div>';

	return htmlStr;
}

function refreshContainer(pool){
	$('#itemcontainer > .div_item').remove();
	$('#resultcontainer > .div_item').remove();
	var cssStr = '';
	for (var i=0; i<pool.length; i++) {
		if(pool[i].addType == 'uni'){
			cssStr = 'div_item_shadowB';
		}else{
			cssStr = '';
		}
		ele = $(makeItemURL(pool[i],cssStr));
		$('#itemcontainer').append(ele);
		ele.on("click",ele,function(event) {
			$("#removeItem").text('確定刪除'+event.data.attr("title")+'?');
			$("#removeItem").dialog({
				modal: true,
				title: '確認視窗',
				buttons: {
					Ok: function() {
						removeFromPool({"key":event.data.attr("key")});
						event.data.remove();
						$(this).dialog( "close" );
					}
				}
			});
		});
	}
	interrupt = true;
	clearLines();
}

function reloadTableData(){
	var tree = $("#tree").fancytree("getTree");
	tableData = new Array();
	gcount = 0;
	getList(tableData, "root", tree.rootNode, 0);
}

function lotteryPrep(pool){
	reloadTableData();
	normalize();
	var pPool = new Array();
	var counter = 0;
	//counting percentage
	$.each(pool, function(index, val) {
		if(p = $('#span_p'+val.node.key).text()){
			pPool[counter] = jQuery.extend({}, val);
			pPool[counter].p = parseFloat($('#span_p'+val.node.key).attr("pp"));
			pPool[counter].dirty = 0;
			counter++;
		}else{

		}
	});

	return pPool;
}

function single_pick(pool){	
	var L = random()*100;
	var sum = 0.0;
	var counter = 0;
	while(sum < L){
		sum += pool[counter].p;
		counter++;
	}
	pool[counter-1].index = counter-1;
	return pool[counter-1];
}

function prepMatch(){
	targetPoolDirty = new Array;

	for(var i=0;i<targetPool.length;i++){
		targetPoolDirty[i] = 0;
	}

	for(var i=0;i<prepPool.length;i++){
		if(prepPool[i].dirty != 0){
			prepPool[i].dirty = 0;
		}
	}


}

function targetMatch(node, dataPool){
	var match = 0;
	$.each(targetPool, function(index, val) {
		if(targetPoolDirty[index] == 0){
			if(val.min <= node.min && val.max >= node.min && ((val.addType == 'copy' || (val.addType == 'uni' && dataPool[node.index].dirty == 0)))){
			//if(val.min <= node.min && val.max >= node.min){
				targetPoolDirty[index] = 1;
				match = 1;
				return false;
			}
		}
	});
	dataPool[node.index].dirty = 1;
	return match;
}

function slice_hist(peroid, loops){
	if(threadLock == true){
		return;
	}
	threadLock = true;
	accuData.past = accuData.current;
	accuData.pastTime = Date.now();
	if(targetPool.length > 0){
		var sum = 0;
		var tryNum = 0;
		if(peroid > 0){
			startT = Date.now();
			while(startT + peroid*0.9 > Date.now() && !interrupt){
				sum = 0;
				tryNum = 0;					
				prepMatch();
				while(sum < targetPool.length && tryNum < accuData.limit){
					sum += targetMatch(single_pick(prepPool),prepPool);
					tryNum++;
				}
				accuData.hist[tryNum]++;
				accuData.current++;
			}
		}else{
			for(var i=0;i<loops;i++){			
				sum = 0;
				tryNum = 0;					
				prepMatch();
				while(sum < targetPool.length && tryNum < accuData.limit){
					sum += targetMatch(single_pick(prepPool),prepPool);
					tryNum++;
				}
				accuData.hist[tryNum]++;
			}
			accuData.current += loops;
		}

	}
	drawHisto(accuData);
	if((accuData.stopType == 'repeat' && accuData.current >= accuData.max) || (accuData.stopType == 'time' && accuData.maxTime > 0 && Date.now() > accuData.startTime + accuData.maxTime)){
		clearTimeout(timerID);
		showResult(accuData);
	}
	if(interrupt){
		clearTimeout(timerID);
		accuData.maxTime = 0;
		backgraphics.interactive = true;
		$('#btn_histo').text('模擬Go');
		$('#btn_pick').prop('disabled', false);
	}
	//console.log(accuData.current - accuData.past);
	threadLock = false;
}

function refreshResult(pool){

	$('#resultcontainer > .div_item').remove();

	for (var i=0; i<pool.length; i++) {
		$('#resultcontainer').append(makeItemURL(pool[i],''));
	}
}

function poolCheck(node, pool){	//檢查加入的node是否合理
	//複製targetPool
	var tPool = new Array();
	for (var i=0;i<pool.length;i++) {
		tPool.push(pool[i]);
	}

	insertToPool(node, tPool);

	var dirtyPool = new Array();

	for(var i=0;i<=tPool[tPool.length-1].max;i++){
		dirtyPool[i] = 0;
	}

	for(var index=0;index<tPool.length;index++){

		var val = tPool[index];

		//node
		if(val.min == val.max){
			if(dirtyPool[val.min] == 1 && val.addType == 'uni'){
				return false;
			}
			dirtyPool[val.min] = 1;
		}else{
		//group
			var counter = val.min;
			while(dirtyPool[counter] == 1 && counter <= val.max){
				counter++;
			}
			if(counter > val.max && val.addType == 'uni'){
				return false;
			}
			if(counter <= val.max){
				dirtyPool[counter] = 1;
			}
		}
	}
	return true;
}

function sel_op(key){
	var ele = $('#sel_op'+key);
	treeNode_command(ele.val());
	ele.val(0);
}

function treeNode_command(cmd){
	var refNode, moveMode,
	tree = $('#tree').fancytree("getTree"),
	node = tree.getActiveNode();

	switch( cmd ) {
		case "addpool":
			var counter = 0;
			if(node.folder){
				for(var i=0;i<node.children.length;i++){
					var nodeW = parseFloat($('#input_w'+node.children[i].key).val());
					if(nodeW == 0 || isNaN(nodeW)){
						$("#showResult").text('項目：'+node.children[i].title+'權重設定有誤');
						$("#showResult").dialog({
							modal: true,
							title: '提示',
							buttons: {
								Ok: function() {
									$( this ).dialog( "close" );
								}
							}
						});
						return;
					}
				}
			}else{
				var nodeW = parseFloat($('#input_w'+node.key).val());
				if(nodeW == 0 || isNaN(nodeW)){
					$("#showResult").text('項目權重設定有誤');
					$("#showResult").dialog({
						modal: true,
						title: '提示',
						buttons: {
							Ok: function() {
								$( this ).dialog( "close" );
							}
						}
					});
					return;
				}
			}
			interrupt = true;
			while(counter < tableData.length && node.key != tableData[counter].node.key){
				counter++;
			}
			if(counter < tableData.length){
				if(tableData[counter].node.folder){
					$("#dialog-confirm").html("重複計算：抽到相同子項目會重複計算次數<br/>不重複計算：子項目無論重複多少張只算抽出一次");
					$("#dialog-confirm").dialog({
							resizable: false,
							height: "auto",
							width: 400,
							modal: true,
							buttons: {
								"重複計算": function() {
									addPool(tableData[counter], 'copy');
									refreshContainer(targetPool);
									$( this ).dialog( "close" );
								},
								"不重複計算": function() {
									addPool(tableData[counter], 'uni');
									refreshContainer(targetPool);
									$( this ).dialog( "close" );
								}
							}
					});
				}else{
					addPool(tableData[counter], 'copy');
				}					
				
			}
			refreshContainer(targetPool);
			break;
		case "removeItem":
			var counter = 0;
			while(counter < tableData.length && node.key != tableData[counter].node.key){
				counter++;
			}
			if(counter < tableData.length){
				removeFromPool(tableData[counter]);
				refreshContainer(targetPool);
			}
			break;
		case "rename":
			node.editStart();
		break;

		case "showItemInfo":
			//console.log(node);

			var testData = { No: 1, Name: "Jeffrey", Score: 959 };
			$("#showInfo").html("");
			$("#tmplItem").tmpl(testData).appendTo('#showInfo');
			$("#showInfo").dialog({title: node.title});

		break;

		case "remove":
			$("#dialog-confirm").html("確定要刪除項目"+node.title+"?");
			$("#dialog-confirm").dialog({
				resizable: false,
				height: "auto",
				width: 400,
				modal: true,
				buttons: {
					"取消": function() {
						$( this ).dialog( "close" );
					},
					"確定": function() {
						refNode = node.getNextSibling() || node.getPrevSibling() || node.getParent();
						node.remove();
						if( refNode ) {
							refNode.setActive();
						}
						targetPool = new Array();
						refreshContainer(targetPool);
						reloadTableData();
						normalize();
						interrupt = true;
						$( this ).dialog( "close" );
					}
				}
			});
			break;
		case "addChild":
			node.editCreateNode("child", "");
		break;
		case "addSibling":
			node.editCreateNode("after", "");
		break;
		case "cut":
			CLIPBOARD = {mode: data.cmd, data: node};
		break;
		case "copy":
			CLIPBOARD = {
				mode: data.cmd,
				data: node.toDict(function(n){
					delete n.key;
				})
			};
			break;
		case "clear":
			CLIPBOARD = null;
			break;
		case "paste":
			if( CLIPBOARD.mode === "cut" ) {
				// refNode = node.getPrevSibling();
				CLIPBOARD.data.moveTo(node, "child");
				CLIPBOARD.data.setActive();
			}else if( CLIPBOARD.mode === "copy" ) {
				node.addChildren(CLIPBOARD.data).setActive();
			}
			break;
		default:
			alert("Unhandled command: " + data.cmd);
		return;
	}
}

// function toDataURL(url, callback) {
// 	var xhr = new XMLHttpRequest();
// 	xhr.onload = function() {
// 		var reader = new FileReader();
// 		reader.onloadend = function() {
// 			callback(reader.result);
// 		}
// 		reader.readAsDataURL(xhr.response);
// 	};
// 	xhr.open('GET', url);
// 	xhr.responseType = 'blob';
// 	xhr.send();
// }

function getURL(url, callback) {
	return new Promise(function(resolve,reject){
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			var reader = new FileReader();
			reader.onloadend = function() {
				callback(reader.result);
				resolve(reader.result);
			}
			reader.readAsDataURL(xhr.response);
		};

		xhr.onerror = function(){
			reject(new Error(xhr.statusText));
		}
		xhr.open('GET', url);
		xhr.responseType = 'blob';
		xhr.send();	
	});	
}


function showPickAnim(result, sum, step, animTime){
	// 時差顯示
	if(step < result.length){
		var cssStr = '';
		if(result[step].match == 1){
			cssStr = 'div_item_shadowA';
		}
		var cur_ele = $(makeItemURL(result[step].node,cssStr));
		$('#resultcontainer').append(cur_ele);
		cur_ele.hide();
		cur_ele.fadeIn();

		wrapper_bottom = $('#resultcontainerWrapper').position().top + $('#resultcontainerWrapper').height();
		wh = window.innerHeight || document.body.clientHeight;
		$('html, body').animate({scrollTop: wrapper_bottom-wh+120}, 0);
		$('#resultcontainer').animate({scrollTop: $('#resultcontainer').prop('scrollHeight')}, animTime, function(){
			showPickAnim(result, sum, step+1, animTime);
		});
	}else{
		if(sum == targetPool.length){
			$("#showResult").text('總共'+result.length+'抽');
			$("#showResult").dialog({
				modal: true,
				title: '抽卡結果',
				buttons: {
					Ok: function() {
						$( this ).dialog( "close" );
					}
				},
				close: function(){
					$('#btn_pick').prop('disabled',false);
				}
			});
			$('#btn_histo').prop('disabled',false);
		}else{
			$("#showResult").text('已經'+drawLimit+'抽，但還沒畢業！');
			$("#showResult").dialog({
				modal: true,
				title: '抽卡結果',
				buttons: {
					Ok: function() {
						$( this ).dialog("close");
					}
				},
				close: function(){
					$('#btn_pick').prop('disabled',false);
				}
			});			
		}
		
	}
}
