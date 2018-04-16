function sp_preproc(){
	for (var i=0; i<sp.length;i++) {
		if(sp[i].sp == "cf_35" && sp[i].count >= 30){
			if(random()<0.2*(sp[i].count-29)){
				sp[i].count = 0;
				return sp[i].key;
			}
		}
		sp[i].count++;
	}
	return 0;
}


function refresh_sp(){
	for (var i=0; i<sp.length;i++) {
		sp[i].count = 0;
	}
}