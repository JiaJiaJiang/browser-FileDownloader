# browser-FileDownloader

File downloader for browser

## Feature

This downloader will try resume the progress at the breakpoint if available.

Note: This downloader uses `fetch()` to fetch content, resources from other domains must have correct CORS headers.

## Get

### 1. Directly use `dist/FileDownloader.js`

Just load `FileDownloader.js` by script tag and the `FileDownloader` is the class object.

### 2. Install from npm

```shell
npm i @luojia/browser-filedownloader
```
Then in your javascript code:

```javascript
import FileDownloader from '@luojia/browser-filedownloader'
```

## Usage

```javascript
const downloader=new FileDownloader(url,{
	//should it start downloading after the instance created.
	autoStart:true,

	autoRetry:10,//retry times

	//if you don't want to process the result, set this to true and the result will be saved to you device.
	autoSave:false,

	//when autoSavem is true, you can set the filename here.
	//the file extension is not required, the browser will add it automatically based on file mime type.
	fileName:`name`,

	fetchOptions:{},//options for fetch()

	//retry if stream stucked. If there is no byte received in 1 second, it is treated as stucked.
	retryWhenStuck:true,

	//a function for progress events
	progress(loaded,total){
		console.log('downloaded:',loaded,'of',total,'bytes');
	},

	//a function for loaded result
	load(blob,objectURL){
		//you don't need to set this function if autoSave is true

		//here is what auto save does
		let a = document.createElement('a');
			a.href=objectURL;
			a.download = encodeURIComponent(this.opts.filename);
			a.click();
	},

	//a function for download error
	error(err){
		console.error(err);
		//if an error occurred, the downloader will stop the task
		//when retry times reach the limit, an error will emit too
	}
});

//start downloading, you don't need to call this if autoStart is true
downloader.start();

//abort the downloader
downloader.abort();

//close the downloader and clear buffers
downloader.close();
```