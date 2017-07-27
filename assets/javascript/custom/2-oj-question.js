$('.question .title').click(function(e){
    e.preventDefault()

    if($(this).closest('.question').hasClass('is-open')){
        $(this).closest('.question').find('.answer').slideUp({'duration': 100})
        $(this).closest('.question').removeClass('is-open')
    } else {
        $('.question').removeClass('is-open')
        $('.question .answer').slideUp({'duration': 100})
        var thisHeight = $(this).closest('.question').find('.answer').slideDown({'duration': 100})
        $(this).closest('.question').addClass('is-open');
    }

})