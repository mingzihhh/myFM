
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
            $('.fm-intro').css('display','none')
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
        this.$collectList = $('#my-songs .img-ct')
        this.isCollect = false
       
       

        this.bind()

    },
    bind: function(){
        var _this = this
        //获取歌单
        EventCenter.on('select-list',function(e,list){
            //console.log('select',list)
            _this.listId = list.listId
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
            if (_this.$container.find('.icon-play')){
                _this.$container.find('.icon-play').removeClass('icon-play').addClass('icon-pause')
            }
            _this.audio.pause()
            if (_this.isCollect) {
                _this.loadCollection()
            } else {
                if (_this.index > 1) {
                    _this.index = _this.index - 2
                    _this.loadSong()
                } else {
                    _this.index = _this.listLength - 1
                    _this.loadSong()
                }
            }
        })
        //切歌
        this.$container.find('.icon-next').on('click',function(){
            if (_this.$container.find('.icon-play')) {
                _this.$container.find('.icon-play').removeClass('icon-play').addClass('icon-pause')
            }
            if(_this.isCollect){
                _this.loadCollection()
            }else{
                _this.loadSong()
            }
            
        })
        //拖动进度条
        this.$container.find('.total-bar').on('click',function(e){
            var percent = e.offsetX/parseInt(getComputedStyle(this).width)
            console.log(percent)
            _this.$container.find('.total-bar .time-bar').css('width', percent * 100 + '%')
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
                console.log(_this.collection)
                _this.deleteCollect(_this.currentSong.title)
            }else{
                $btn.addClass('active')
                _this.collection[_this.currentSong.title] = JSON.stringify(_this.currentSong)
            }
            _this.saveToLocal()
        })
        //播放收藏歌曲
        this.$collectList.on('click','div',function(){
            $nav.eq(0).addClass('active').siblings().removeClass('active')
            $('section').hide().eq(0).fadeIn()
            _this.$container.find('.icon-play').addClass('icon-pause').removeClass('icon-play')
            _this.loadCollection()
        })
        //更新进度条和歌词
        this.audio.addEventListener('play',function(){
            clearInterval(_this.clock)
            _this.clock = setInterval(function(){
                _this.updateState()
                _this.updateLyric()
            },1000)
        })
        //暂停播放
        this.audio.addEventListener('pause',function(){
            clearInterval(_this.clock)
        })
        //播放完自动切歌
        this.audio.addEventListener('ended',function(){
            if (_this.isCollect) {
                _this.loadCollection()
            } else {
                _this.loadSong()
            }
        })
    },
    //加载歌单
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
            _this.isCollect = false
            _this.listLength = list.length
            console.log(list, _this.index, _this.listLength)
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
    //播放歌曲
    play: function(song){
        console.log(song)
        var _this = this
        this.currentSong = song
        this.audio.src = song.url

        if(this.isCollect){
            this.$container.find('.icon-like').addClass('active')
        }
        else if(this.$container.find('.icon-like').hasClass('active')){
            this.$container.find('.icon-like').removeClass('active')
        }
        this.$container.find('img').attr('src',song.pic)
        this.$container.find('.music-info .title').text(song.title)
        this.$container.find('.music-info .author').text(song.author)
        this.audio.ondurationchange = function(){
            var time = _this.setTime(this.duration)
            _this.$container.find('.time .total-time').text(time)
        }
        this.loadLyric(song.lrc)
    },
    //时间格式化
    setTime : function(time){
        var min = Math.floor(time / 60);
        var sec = Math.floor(time % 60);
        min = min.toString().length == 2 ? min : '0' + min;
        sec = sec.toString().length == 2 ? sec : '0' + sec;
        return min + ':' + sec;

    },
    //加载歌词
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
            //console.log(_this.lrcObj)     
        })

    },
    //歌曲播放时更新时间和进度条
    updateState: function(){
        var time = this.setTime(this.audio.currentTime)
        this.$container.find('.time .now-time').text(time)
        this.$container.find('.total-bar .time-bar').css('width',this.audio.currentTime/this.audio.duration*100 + '%')
     
    },
    //设置歌词
    setLyric: function(){
        this.$lyricContent.empty()
        this.$lyricContent.css('top',0)
        if ($.isEmptyObject(this.lrcObj)){
            var html = '<p>' + '暂无歌词' + '</p>'
            var $html = $(html)
            $html.css('padding-top','10vh')
            this.$lyricContent.append($html)
        }
        for(var time in this.lrcObj){
            var html = '<p>'+this.lrcObj[time]+'</p>'
            this.$lyricContent.append($(html))
        }

    },
    //歌曲滚动
    updateLyric: function(){
        var timeStr = this.setTime(this.audio.currentTime)
        var timeArr = Object.keys(this.lrcObj)
        var len = timeArr.length
        var height = this.$lyric.find('p').height()
        if (timeStr > timeArr[len - 1]) {
            this.$lyric.find('p').eq(len - 1).addClass('playing-lyric')
                .siblings().removeClass('playing-lyric')
            var remove = -height * (len - 4)
            this.$lyricContent.animate({
                top: remove
            })
        }
        else {
            for (var i = 0; i < len; i++) {
                if (timeStr >= timeArr[i] && timeStr <= timeArr[i + 1]) {
                    this.$lyric.find('p').eq(i).addClass('playing-lyric')
                        .siblings().removeClass('playing-lyric')
                    console.log(i, timeStr, this.$lyric.find('p').eq(i)[0])
                    if (i > 4) {
                        var remove = -height * (i - 4)
                        this.$lyricContent.animate({
                            top: remove
                        })
                    }
                }

            }

        }
     },
     //加载收藏
     loadFromLocal: function(){
         return JSON.parse(localStorage['collection']||'{}')
     },
     //保存为收藏
     saveToLocal: function(){
         localStorage['collection'] = JSON.stringify(this.collection)
         console.log(localStorage['collection'])
     },
     //获取收藏
     loadCollection: function(){
         console.log(this.collection)
         this.isCollect = true
         var keyArray = Object.keys(this.collection)
         if(keyArray.length === 0) return 
         var randomIndex = Math.floor(Math.random()*keyArray.length)
         var randomTitle = keyArray[randomIndex]
         var song = JSON.parse(this.collection[randomTitle])
         this.play(song)
     },
     //删除收藏
     deleteCollect: function(title){
         localStorage.removeItem(title)
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
