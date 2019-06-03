var draw_buffer;
var card_cand;
var card_sum;
var pom_sum;
var pom_plus;

function sp_preproc(){
	for (var i=0; i<sp.length;i++) {
		if(sp[i].sp == "cf_35"){
			if(sp[i].count >= 34){
				sp[i].count = 0;
				return sp[i].key;
			}else{
				sp[i].count++;
			}
		}
		
		if(sp[i].sp == "pompeiiMech_40"){
			if (card_cand == undefined || card_cand.length == 0){
				pom_plus = [2,4,6,8,10,12,14,16,18,20];
				card_cand = new Array();
				card_sum = 0;
				for(var j=0;j<sp.length;j++){
					if(sp[j].sp =='pomMech_10'){
						card_cand.push(sp[j]);
						card_sum += sp[j].w;
					}
				}
				draw_buffer = new Array();
				pom_sum = 0;

				draw_buffer[0] = {"key":sp[i].key,"countDown":gen_pomLoc()};
				var mLoc = gen_mechLoc(draw_buffer[0].location);
				draw_buffer[1] = {"key":get_mechCard(),"countDown":mLoc,"neg":10-mLoc};
			}
			pom_sum++;
			draw_buffer[0].countDown--;
			draw_buffer[1].countDown--;
			if(draw_buffer[0].countDown <= 0){
				draw_buffer[0].countDown = gen_pomLoc();
				//console.log(pom_sum + ' : 保底的');
				return draw_buffer[0].key;
			}else if(draw_buffer[0].countDown <= 9){
				if(pom_plus[9-draw_buffer[0].countDown] > Math.random()*100){
					return draw_buffer[0].key;
				}
			}
			if(draw_buffer[1].countDown <= 0){
				var picked = draw_buffer[1].key;
				neged = draw_buffer[1].neg;
				mLoc = gen_mechLoc(draw_buffer[0].location)
				draw_buffer[1] = {"key":get_mechCard(),"countDown":mLoc+neged,"neg":10-mLoc};
				//console.log(pom_sum + ' : 10抽保');
				return picked;
			}

		}

		if(sp[i].sp == "hunter_35"){
			sp[i].count++;
			if(sp[i].count >= 35){
				sp[i].count = 0;
				return sp[i].key;
			}else if(sp[i].count >= 26){
				if((sp[i].count-25)*3+1 > Math.random()*100){		//4,7,10,13,16,19,21,24,27,30
					return sp[i].key;
				}
			}
		}

		if(sp[i].sp == "warranty"){

			sp[i].count++;
			if(sp[i].count >= spData.max){
				sp[i].count = 0;
				return sp[i].key;
			}else if(sp[i].count >= spData.stepStart){
				if(spData.step[sp[i].count-spData.stepStart] > Math.random()*100){
					return sp[i].key;
				}
			}
		}

		if(spData.wrap == true){
			if(spData.pool.length == 0){
				for(i=0;i<tableData.length;i++){
					if(tableData[i].exp == "n"){
						for(j=0;j<Math.floor(tableData[i].w);j++){
							spData.pool.push(tableData[i].key)
						}
					}
				}
				
				//打亂
				poolNum = spData.pool.length;
				for(i=0;i<poolNum;i++){
					excLoc = Math.floor(Math.random()*poolNum);
					tempEle = spData.pool[excLoc];
					spData.pool[excLoc] = spData.pool[i];
					spData.pool[i] = tempEle;
				}
			}
			return spData.pool.pop();
		}
		
		
	}

	return 0;
}


function refresh_sp(){
	for (var i=0; i<sp.length;i++) {
		sp[i].count = 0;
	}
	card_cand = new Array();
	draw_buffer = new Array();
	spData.pool = [];
}

function gen_pomLoc(){
	// var p = 1;
	// while(Math.random()*10>p){
	// 	p++;
	// }
	// return p+30;
	return 40;
}

function gen_mechLoc(p_loc){
	var m;
	do{
		m = Math.floor(Math.random()*10)+1;
	}while(m == p_loc);
		
	return m;
}

function get_mechCard(){
	var loc = Math.random()*card_sum;
	var i = 0;
	do{
		loc -= card_cand[i].w;
		i++;
	}while(loc>0);
	return card_cand[i-1].key;
}

var hunter35 = function(i){
	
	sp[i].count++;
	console.log(sp[i].count);
	if(sp[i].count >= 34){
		sp[i].count = 0;
		console.log('1');
		return sp[i].key;
	}else if(sp[i].count >= 24){
		if((sp[i].count-25)*2+10 > Math.random()*100){
			console.log('2');
			return sp[i].key;
		}
	}
	console.log('3');
	return 0;
}