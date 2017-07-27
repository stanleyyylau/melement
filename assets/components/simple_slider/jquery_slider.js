// HTML structure
//
//.slider-viewport
//  .slides-container
//    .slides
//			.slider-back
//			.slider-forward

;(function($) {

	$.fn.slider = function( options ) {

		// Establish our default settings
		var settings = $.extend({
			sliderViewport: 780,
      isResponsive: null,
      playPerSecond: null,
      doItAfterEachSlide: null,
      isFadeIn: null
		}, options);

    var slider = {
      currentSlide: 0,
      totalSlides: 0,
      makeZeroTrue: 0,
			stop: null,

      setUp: function(isResponsive){
        // If you want reponsive slider
        var viewportWidth, containerWidth, totalSlides;

        slider.totalSlides = $('.slides').length;

        if(isResponsive){
          viewportWidth = $('.slider-viewport').width();
					settings.sliderViewport = viewportWidth;
          containerWidth = slider.totalSlides * viewportWidth;
        }else{
          viewportWidth = settings.sliderViewport;
          containerWidth = slider.totalSlides * settings.sliderViewport;
        }
				$('.slides').css('width', viewportWidth+'px');
        $('.slider-viewport').css('width', viewportWidth+'px');
				$('.slider-back').hover(function(){
					slider.stop = true;
				})
				$('.slider-forward').hover(function(){
					slider.stop = true;
				})
				$('.slider-back').mouseout(function(){
					slider.stop = false;
				});
				$('.slider-forward').mouseout(function(){
					slider.stop = false;
				});
        $('.slides-container').css('width', containerWidth+'px');
        $('.slider-back').click(function() { slider.slide('back'); });
        $('.slider-forward').click(function() { slider.slide('forward'); });
      },

      slide: function(direction){
        // this will determine the direction and call slide(num)
        if(direction == 'back'){
          if(slider.currentSlide == 0){
            slider.currentSlide = slider.totalSlides-1;
            slider.slideIt(slider.currentSlide);
          }else{
            slider.currentSlide--;
            slider.slideIt(slider.currentSlide);
          }
        };

        if(direction == 'forward'){
          if(slider.currentSlide == slider.totalSlides-1){
            slider.currentSlide = 0;
            slider.slideIt(slider.currentSlide);
          }else{
            slider.currentSlide++;
            slider.slideIt(slider.currentSlide);
          }
        }
      },

      slideIt: function(index){
        //if going forward
        var time = 2000;
        if(settings.isFadeIn){
          $('.slides').eq(index).css('opacity','0');
          var position = '-' + settings.sliderViewport*index + 'px';
          $('.slides-container').css('left',position);
          // Handle opacity here
          var inInterval = setInterval(function() {
    				var newOpacity = Number($('.slides').eq(index).css('opacity'))+0.1;
    				if (newOpacity >= 1) {clearInterval(inInterval);}
            $('.slides').eq(index).css('opacity',newOpacity);
    			}, time/50 );
        }else{
          var positionNumberPositive = index * settings.sliderViewport;
          var currentTransitionNumber = $('.slides-container').first().css('left').slice(0,-2);
          var currentTransitionNumber = Number(currentTransitionNumber)
          var currentTransitionNumberPositive = Math.abs(currentTransitionNumber);
          var transitionInterval;
          var init = (new Date()).getTime(); //start time
          var disp = positionNumberPositive - currentTransitionNumberPositive;
          var time = 500;
					$('.slides-container').animate({left:'-'+positionNumberPositive},500)
        }

        slider.currentSlide = index;

				// Callback
				if ( $.isFunction( settings.doItAfterEachSlide ) ) {
					settings.doItAfterEachSlide.call(this,index);
				}
      },

      playPerSecond: function(num){
        setInterval(function(){
					if(slider.stop){
						return;
					}
          slider.slide('forward');
        },num)
      },

      init: function(){
        if(settings.isResponsive == true){
          slider.setUp(true);
          $(window).resize(function(){
						settings.sliderViewport = $('.slider-viewport').width();
						var containerWidth = $('.slides').length * settings.sliderViewport;
						$('.slider-viewport').css('width', settings.sliderViewport+'px');
						$('.slides').css('width', settings.sliderViewport+'px');
		        $('.slides-container').css('width', containerWidth+'px');
						slider.slideIt(slider.currentSlide);
					});
        }else{
          slider.setUp(false);
        }
        if(settings.playPerSecond){
          slider.playPerSecond(settings.playPerSecond);
        }
      }
    }

    slider.init();
		return {
      goTo: slider.slideIt
    };

	};

}(jQuery));


// http://codepen.io/stanleyyylau/pen/QKxEpR
// How to use
