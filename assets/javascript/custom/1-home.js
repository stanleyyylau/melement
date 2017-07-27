$(document).ready(function(){
    var homeSlider = $('.slider-viewport').slider({
        isResponsive: true,
        doItAfterEachSlide: function(index){
            var currentSlide = Number(index+1);
            console.log('刚刚播放的轮播是第 ' + currentSlide +' 张');
        }
    })

    $('.slider-control').click(function(e){
        e.preventDefault()
        var index = $(this).data(index);
        homeSlider.goTo(index.index);
        $('.slider-control').removeClass('is-active');
        $(this).addClass('is-active')
    })
})