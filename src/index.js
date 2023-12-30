function delay(ms){
	return new Promise((ok)=>{
		setTimeout(ok, ms);
	});
}
class FileDownloader{
	aborter=null;
	buffer=[];
	supportRange=false;
	loadedBytes=0;
	totalBytes=null;
	etag;
	blob;
	contentType;
	lastModified;
	_stuckChecker;
	_lastLoaded=0;
	objectURL;
	opts;
	source;
	retryCount;
	closed=false;
	onProgress(loaded,total){}//override it
	onLoad(blob,objectURL){}//override it
	onError(err){}//override it
	constructor(source,opts={}){
		this.source=source;
		this.opts=Object.assign({
			autoStart:true,
			autoRetry:10,
			autoSave:false,
			fetchOptions:{},//options for fetch()
			fileName:`download_${new Date().toLocaleString().replaceAll('/','-').replaceAll(':','_')}`,
			retryWhenStuck:true,//retry if stream stucked
		},opts);
		this.retryCount=this.opts.autoRetry;
		if(typeof opts.progress === 'function'){
			this.onProgress=opts.progress;
		}
		if(typeof this.opts.load === 'function'){
			this.onLoad=this.opts.load;
		}
		if(typeof this.opts.error === 'function'){
			this.onError=this.opts.error;
		}
		window.addEventListener('unload',()=>{
			this.close();
		});
		if(this.opts.autoStart){
			this.start();
		}
	}
	async start(){
		try{
			if(this.closed){
				throw(new Error('This downloader has been closed'));
			}
			if(this.aborter){
				this.abort();
			}
			if(this.loadedBytes && this.loadedBytes===this.totalBytes){
				return;
			}
			this.aborter=new AbortController();
			let headers=new Headers(this.opts.headers);
			if(this._stuckChecker)clearTimeout(this._stuckChecker);
			if(this.opts.fetchOptions?.headers){//mixin custom headers
				/* 
					headers should be an array of [key,value] arrays
				*/
				for(let header of this.opts.fetchOptions?.headers){
					headers.append(header[0],header[1]);
				}
			}
			// this._continueChecker(headers);
			let res;
			try{
				res=await fetch(this.source,Object.assign({},this.opts.fetchOptions||{},{headers,signal:this.aborter.signal}));
				if(res.status>=400)throw(new Error('status '+res.status));
				this._setMetaInfo(res);
				let reader=await res.body.getReader();
				let done,value;
				do{
					({value,done} = await reader.read());
					clearTimeout(this._stuckChecker);
					if(value){
						this.buffer.push(value);
						this.loadedBytes += value.length;
						this._lastLoaded=this.loadedBytes;
						if(this.opts.retryWhenStuck){
							this._stuckChecker=setTimeout(()=>{
								if(this.loadedBytes!==0 && this._lastLoaded===this.loadedBytes){//no new data for 1s
									this.start();
								}
							},1000);
						}
						this.onProgress(this.loadedBytes,this.totalBytes);
					}
				}while(!done);
			}catch(err){
				console.error(err);
				if(err.message.startsWith('status')){
					throw(err);
				}
				if(err.message.indexOf('abort')>0){
					return;
				}
				clearTimeout(this._stuckChecker);
				if(this.retryCount && !this.closed){
					await delay(1000);
					this.retryCount--;
					return this.start();
				}else{
					this.close();
					throw(err);
				}
			}
		}catch(err){
			this.onError(err);
			return;
		}finally{
			clearTimeout(this._stuckChecker);
		}
		
		let blob=this.blob=new Blob(this.buffer,{type:this.contentType});
		this.onLoad(blob,this.objectURL=URL.createObjectURL(blob));
		if(this.opts.autoSave){//save the file
			let a = document.createElement('a');
			a.href=this.objectURL;
			a.download = encodeURIComponent(this.opts.filename);
			a.click();
		}
	}
	abort(){
		this.aborter.abort();
	}
	close(){
		if(this.closed)return;
		this.closed=true;
		this._clearBuffer();
		clearTimeout(this._stuckChecker);
		this.abort();
		if(this.blob?.close)this.blob.close();
		if(this.objectURL){
			URL.revokeObjectURL(this.objectURL);
			this.objectURL=null;
		}
	}
	/* _continueChecker(headers){
		if(!this.supportRange)return;
		let ifRange=this.lastModified||this.etag;
		console.debug('ifRange',ifRange);
		if(!ifRange)return;
		headers.set('if-range',ifRange);
		headers.set('range',`bytes=${this.loadedBytes}-`);
		console.debug('request header:',[...headers.entries()]);
	} */
	_setMetaInfo(res){
		console.debug('response header:',[...res.headers.entries()]);
		let headers=res.headers;
		if(this.buffer.length===0){
			let length=headers.get('content-length');
			if(length){
				this.totalBytes = Number(length);
				console.debug('content-length',this.totalBytes);
			}
		}
		//range
		this.supportRange=!!headers.get('accept-ranges');
		if(res.status!==206){
			console.debug('start from head');
			this._clearBuffer();
		}else{
			console.debug('continue transport');
		}
		if(!this.etag)this.etag=headers.get('etag');
		if(!this.lastModified)this.lastModified=headers.get('last-modified');
		if(!this.contentType)this.contentType=headers.get('content-type');
	}
	_clearBuffer(){
		this.buffer.length=0;
		this.loadedBytes=0;
	}
}

export default FileDownloader;