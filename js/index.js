
var $musicPlayer = $('#music-page')
var $musicList = $('#music-list')
var $mySongs = $('#my-songs')
var $nav = $('.fm-header .navbar>li')

var EventCenter = {
    on: function(type,handler){
        $(document).on(type,handler)
    },
    fire: function(type,data){
        $(document).trigger(type,data)
    }
}
//分页跳转
var Paging = {
    init: function(){
        this.$panels = $('section')
        this.$nav = $nav
        this.bind()
    },
    bind: function(){
        var _this = this
        this.$nav.on('click',function(){
            $(this).addClass('active').siblings().removeClass('active')
            _this.$panels.hide().eq($(this).index()).fadeIn()
        })
    }
}
//加载歌单
var MusicList = {
    init: function(){
        this.$container = $musicList
        this.$content = this.$container.find('.img-ct')
        this.$playBtn = $('#music-page .buttons .icon-play')
        // console.log(this.$playBtn[0])
        //this.$tag = $('#load')
        this.isDataArrive = true

        this.bind()
        this.start()
        
       
    },
    bind: function(){
        var _this = this
        if(!this.isDataArrive) return 
        this.isDataArrive = true
        this.discoverLength = 0

        // $(window).scroll(function(){
        //     if(_this.isBottom(_this.$tag))
        //     _this.start()
        // }
        // console.log(this.$content)
        this.$content.on('click','a',function(){
            EventCenter.fire('select-list',{
                listId: $(this).attr('list-id'),
                listLength:  _this.discoverLength
            })
            $musicPlayer.show()
            $musicList.hide()

            $nav.eq(0).addClass('active').siblings().removeClass('active')
            _this.$playBtn.addClass('icon-pause').removeClass('icon-play')
            
        })

    },
    start: function(){
        var _this = this
        this.getData(function(data){
            _this.render(data)
        })
    },
    getData: function(callback){
        var _this = this
        $.ajax({
            type: "POST",
            url: "https://api.hibai.cn/api/index/index",
            data: {
                'TransCode': '020551',
                'OpenId': '7cwa.com',
                'Body': ''
            },
            dataType: 'json',
            async: false
        }).done(function(ret){
            discoverList = ret.Body
            callback(discoverList)
            _this.discoverLength = discoverList.length
        }).fail(function(){
            console.log('error')
        })
    },
    render: function(data){
        console.log(data)
        var _this = this
        data.forEach(function(list){
              _this.$content.append(_this.addContent(list))
        })
        _this.isDataArrive = false
    },
    addContent: function(list){
        var html = ` 
                <div>
                    <a href="#" list-id="">
                    <img src="" alt="">
                    <div class="shadow"><i class="iconfont icon-list-play"></i></div>
                    </a>
                    <p class="title"></p>
                </div>`
        var $html = $(html)
        $html.find('a').attr('list-id',list.discover_id)
        $html.find('img').attr('src', list.discover_pic)
        $html.find('.title').text(list.discover_title)
        // console.log($html[0])
        return $html
    },
    // isBottom: function($node){
    //     return $node.offset().top - 10 <= $(window).scrollTop() + $(window).height() 
    // }
}
//播放界面
var Player = {
    init: function(){
        this.$container = $('#music-page .player')
        this.$lyric = this.$container.find('.lyric')
        this.$lyricContent = this.$lyric.find('.all-lyric')
        this.$volume = this.$container.find('.volume')
        this.listId = null
        this.listLength = 0
        this.currentSong = null
        this.audio = new Audio()
        this.audio.autoplay = true
        this.index = 0 //歌单顺序
        this.clock = null
        this.rollLine = 0

        this.collection = this.loadFromLocal()
        this.collectIndex = 1 //收藏顺序
        this.$collect = $('#my-songs .song-list')
       
       

        this.bind()

    },
    bind: function(){
        var _this = this
        //获取歌单
        EventCenter.on('select-list',function(e,list){
            //console.log('select',list)
            _this.listId = list.listId
            _this.listLength = list.listLength
            _this.index = 0
            _this.loadSong()
        })
        //播放暂停歌曲
        this.$container.find('.icon-play').on('click',function(){
            if($(this).hasClass('icon-play')){
                $(this).removeClass('icon-play').addClass('icon-pause')
                _this.audio.play()
            }else {
                $(this).removeClass('icon-pause').addClass('icon-play')
                _this.audio.pause()
            }
        })
        //上一首
        this.$container.find('.icon-prev').on('click',function(){
            if(_this.index > 1){
                _this.index = _this.index - 2
                _this.loadSong()
            }else{
                console.log(_this.listLength)
                _this.index = _this.listLength - 1
                _this.loadSong()
            }
  
        })
        //切歌
        this.$container.find('.icon-next').on('click',function(){
            _this.loadSong()
        })
        //拖动进度条
        this.$container.find('.bar').on('click',function(e){
            var percent = e.offsetX/parseInt(getComputedStyle(this).width)
            console.log(percent)
            _this.$container.find('.bar .time-bar').css('width', percent * 100 + '%')
            _this.audio.currentTime = _this.audio.duration * percent
            
        })
        //调整音量
        this.$volume.mouseenter(function(){
            _this.$volume.find('.v-bar').animate({
                width: '10vh'
            })
        })
        this.$volume.mouseleave(function () {
            _this.$volume.find('.v-bar').animate({
                width: 0
            })
        })
        this.$volume.find('.v-bar').on('click',function(e){
            var percent = e.offsetX/parseInt(getComputedStyle(this).width)
            $(this).find('.adjust-bar').css('width',percent*100 + '%')
            _this.audio.volume = percent

        })
        //收藏歌曲
        this.$container.find('.icon-like').click(function(){
            var $btn = $(this)
            if($btn.hasClass('active')){
                $btn.removeClass('active')
                delete _this.collection[_this.currentSong.title]
                _this.deleteCollect()
            }else{
                $btn.addClass('active')
                _this.collection[_this.currentSong.title] = JSON.stringify(_this.currentSong)
                _this.renderCollect()
            }
            _this.saveToLocal()
        })
        //更新进度条和歌词
        this.audio.addEventListener('play',function(){
            clearInterval(_this.clock)
            _this.clock = setInterval(function(){
                _this.updateState()
                _this.updateLyric()
            },1000)
        })
        this.audio.addEventListener('pause',function(){
            clearInterval(_this.clock)
        })
        //播放完自动切歌
        this.audio.addEventListener('ended',function(){
            _this.loadSong()
        })
    },
    loadSong: function(){
        var _this = this
        $.ajax({    
            type: "POST",
            url: "https://api.hibai.cn/api/index/index",
            data: {
                'TransCode': '020112', 
                'OpenId': '7cwa.com', 
                'Body': {
                    'SongListId': _this.listId
                }
            },
            dataType: 'json',
            async: false
        }).done(function(ret) {
            var list = ret.Body;
            // console.log(list)
            //console.log(_this.index, _this.listLength)
            if(_this.index < _this.listLength){
                _this.play(list[_this.index++])
            }else{
                _this.index = 0
                _this.play(list[_this.index++])
                
            }
            
        }).fail(function(){
            console.log('error')
        })
    },
    play: function(song){
        console.log(song)
        var _this = this
        this.currentSong = song
        this.audio.src = song.url

        this.$container.find('img').attr('src',song.pic)
        this.$container.find('.music-info .title').text(song.title)
        this.$container.find('.music-info .author').text(song.author)
        this.audio.ondurationchange = function(){
            var time = _this.setTime(this.duration)
            _this.$container.find('.time .total-time').text(time)
        }
        this.loadLyric(song.lrc)
    },
    setTime : function(time){
        var min = Math.floor(time / 60);
        var sec = Math.floor(time % 60);
        min = min.toString().length == 2 ? min : '0' + min;
        sec = sec.toString().length == 2 ? sec : '0' + sec;
        return min + ':' + sec;

    },
    loadLyric: function(lrc){
        var _this = this
        $.ajax({
            type: 'GET',
            url: lrc
        }).done(function(ret){
            var lrcObject = {}
            ret.split('\n').forEach(function(line){
                var timeArr = line.match(/\d{2}:\d{2}/g)
                if(Array.isArray(timeArr)){
                    timeArr.forEach(function(time){
                        var lyc = line.replace(/\[.+?\]/g, '')
                        if(lyc){
                            lrcObject[time] = line.replace(/\[.+?\]/g, '')
                        }
                        
                    })
                }
            })
            _this.lrcObj = lrcObject 
            _this.setLyric()
            // console.log(_this.lrcObj)     
        })

    },
    updateState: function(){
        var time = this.setTime(this.audio.currentTime)
        this.$container.find('.time .now-time').text(time)
        this.$container.find('.bar .time-bar').css('width',this.audio.currentTime/this.audio.duration*100 + '%')
     
    },
    setLyric: function(){
        this.$lyricContent.empty()
        for(var time in this.lrcObj){
            var html = '<p>'+this.lrcObj[time]+'</p>'
            this.$lyricContent.append($(html))
        }

    },
    updateLyric: function(){
        var timeStr = this.setTime(this.audio.currentTime)
        var timeArr = Object.keys(this.lrcObj)
        if(this.lrcObj && this.lrcObj[timeStr]){
            var index = timeArr.indexOf(timeStr)
            //console.log(index,timeStr,this.$lyric.find('p').eq(index)[0])
            this.$lyric.find('p').eq(index).addClass('playing-lyric')
                                 .siblings().removeClass('playing-lyric')    
            var height = this.$lyric.find('p').height()
            if(index > 4){
                var remove = - height * (index - 4)
                this.$lyricContent.animate({
                    top: remove
                })
            }
        }
     },
     loadFromLocal: function(){
         return JSON.parse(localStorage['collection']||'{}')
     },
     saveToLocal: function(){
         localStorage['collection'] = JSON.stringify(this.collection)
     },
     renderCollect: function(){
         var song = this.currentSong
         var html = `
            <li class="clearfix">
                <span class='cols-1 index'></span>
                <div class="song-detail cols-2">
                    <img src="img/1.jpg" alt="">
                    <span class="title"></span>
                </div>
                <span class='cols-1 author'></span>
                <span class='cols-1 duration'></span>
            </li> 
         `
         var $html = $(html)
         $html.find('.index').text(this.collectIndex++)
         $html.find('img').attr('src',song.pic)
         $html.find('.title').text(song.title)
         $html.find('.author').text(song.author)
         $html.find('.duration').text(this.setTime(this.audio.duration))
         this.$collect.append($html)
     }

    

}
var App = {
    init: function(){
        Paging.init()
        MusicList.init()
        Player.init()

    }
}
App.init()