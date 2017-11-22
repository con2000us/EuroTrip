var CLIPBOARD = null;
$(document).ready(function() {

	$.getJSON("data.json", function(json) {
		
		treeSetup(json);

		$("#tree").children('ul').eq(0).css("border","none");

		var tree = $("#tree").fancytree("getTree");
		console.log(tree.options.source);

	});

	
});

function treeSetup(json){
	$("#tree").fancytree({
		checkbox: false,
		titlesTabbable: true,     // Add all node titles to TAB chain
		quicksearch: true,        // Jump to nodes when pressing first character
		source: json,
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
				return true;
			},
			dragDrop: function(node, data) {
				data.otherNode.moveTo(node, data.hitMode);
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
			if( node.isFolder() ) {
				$tdList.eq(2)
				.prop("colspan", 6)
				.nextAll().remove();
			}
		},
		renderColumns: function(event, data) {
			var node = data.node,
			$tdList = $(node.tr).find(">td");

			// (Index #0 is rendered by fancytree by adding the checkbox)
			if(!node.folder){
				$tdList.eq(2).html('<input type="input" id= "input_w'+node.key+'" value="' + node.data.w + '" size=\"4\">');
				$tdList.eq(3).html('<input type="input" id= "input_p'+node.key+'" value="' + node.key + '" size=\"4\">');

				$("#input_w"+node.key).click(function(event) {
					console.log(node.key);
				});
			}else{
				$tdList.eq(4).html(" ");
			}

		}	
	}).on("nodeCommand", function(event, data){
		// Custom event handler that is triggered by keydown-handler and
		// context menu:
		var refNode, moveMode,
		tree = $(this).fancytree("getTree"),
		node = tree.getActiveNode();

		switch( data.cmd ) {
			case "moveUp":
				refNode = node.getPrevSibling();
				if( refNode ) {
					node.moveTo(refNode, "before");
					node.setActive();
				}
				break;
			case "moveDown":
				refNode = node.getNextSibling();
				if( refNode ) {
					node.moveTo(refNode, "after");
					node.setActive();
				}
				break;
			case "indent":
				refNode = node.getPrevSibling();
				if( refNode ) {
					node.moveTo(refNode, "child");
					refNode.setExpanded();
					node.setActive();
				}
				break;
			case "outdent":
				if( !node.isTopLevel() ) {
					node.moveTo(node.getParent(), "after");
					node.setActive();
				}
				break;
			case "rename":
				node.editStart();
			break;
			case "remove":
				refNode = node.getNextSibling() || node.getPrevSibling() || node.getParent();
				node.remove();
				if( refNode ) {
					refNode.setActive();
				}
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

	// }).on("click dblclick", function(e){
	//   console.log( e, $.ui.fancytree.eventToString(e) );

	}).on("keydown", function(e){
		var cmd = null;

		// console.log(e.type, $.ui.fancytree.eventToString(e));
		switch( $.ui.fancytree.eventToString(e) ) {
			case "ctrl+shift+n":
			case "meta+shift+n": // mac: cmd+shift+n
				cmd = "addChild";
				break;
			case "ctrl+c":
			case "meta+c": // mac
				cmd = "copy";
				break;
			case "ctrl+v":
			case "meta+v": // mac
				cmd = "paste";
				break;
			case "ctrl+x":
			case "meta+x": // mac
				cmd = "cut";
				break;
			case "ctrl+n":
			case "meta+n": // mac
				cmd = "addSibling";
				break;
			case "del":
			case "meta+backspace": // mac
				cmd = "remove";
				break;
			// case "f2":  // already triggered by ext-edit pluging
			//   cmd = "rename";
			//   break;
			case "ctrl+up":
				cmd = "moveUp";
				break;
			case "ctrl+down":
				cmd = "moveDown";
				break;
			case "ctrl+right":
			case "ctrl+shift+right": // mac
				cmd = "indent";
				break;
			case "ctrl+left":
			case "ctrl+shift+left": // mac
				cmd = "outdent";
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
			{title: "加入目標池 <kbd>[F2]</kbd>", cmd: "rename", uiIcon: "ui-icon-pencil" },
			{title: "移出目標池 <kbd>[Del]</kbd>", cmd: "remove", uiIcon: "ui-icon-trash" },
			{title: "----"},
			{title: "新增項目 <kbd>[Ctrl+N]</kbd>", cmd: "addSibling", uiIcon: "ui-icon-plus" },
			{title: "刪除項目 child <kbd>[Ctrl+Shift+N]</kbd>", cmd: "addChild", uiIcon: "ui-icon-arrowreturn-1-e" },
			{title: "----"},
			{title: "新增分類 <kbd>[Ctrl+N]</kbd>", cmd: "addSibling", uiIcon: "ui-icon-plus" },					
			{title: "----"},					
			{title: "編輯內容 <kbd>Ctrl+X</kbd>", cmd: "cut", uiIcon: "ui-icon-scissors"},
			{title: "Copy <kbd>Ctrl-C</kbd>", cmd: "copy", uiIcon: "ui-icon-copy"},
			{title: "Paste as child<kbd>Ctrl+V</kbd>", cmd: "paste", uiIcon: "ui-icon-clipboard", disabled: true }
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
}