var draw_buffer;
var card_cand;
var card_sum;
var pom_sum;

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
		
	}

	return 0;
}


function refresh_sp(){
	for (var i=0; i<sp.length;i++) {
		sp[i].count = 0;
	}
	card_cand = new Array();
	draw_buffer = new Array();
}

function gen_pomLoc(){
	var p = 1;
	while(Math.random()*10>p){
		p++;
	}
	return p+30;
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