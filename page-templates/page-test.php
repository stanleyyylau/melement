<?php
/*
Template Name: page-test
*/
get_header(); 
$baseUrl = get_stylesheet_directory_uri();
$imgUrl = get_stylesheet_directory_uri() . '/assets/images';
?>

<div class="row">navigation here</div>

<section class="slider-section">
<ul class="row align-middle align-center">
    <li class="columns small-3"><a href="#" data-index="0" class="slider-control is-active"><div class="control-inner"><img class="slider-control-img" src="<?php echo $imgUrl;?>/slider-icon-1.png"></div></a></li>
    <li class="columns small-3"><a href="#" data-index="1" class="slider-control"><div class="control-inner"><img class="slider-control-img" src="<?php echo $imgUrl;?>/slider-icon-2.png"></div></a></li>
    <li class="columns small-3"><a href="#" data-index="2" class="slider-control"><div class="control-inner"><img class="slider-control-img" src="<?php echo $imgUrl;?>/slider-icon-3.png"></div></a></li>
    <li class="columns small-3"><a href="#" data-index="3" class="slider-control"><div class="control-inner"><img class="slider-control-img" src="<?php echo $imgUrl;?>/slider-icon-4.png"></div></a></li>
</ul>

<div class="row">
    <div class="slider-content slider-viewport">
        <ul class="slides-container">
            <li class="slides">
                <h2 class="slider-content-title">Engineering #1</h2>
                <div class="image-wrap">
                    <img src="<?php echo $imgUrl;?>/slider1-image.png">    
                <div>
            </li>
            <li class="slides">
                <h2 class="slider-content-title">Engineering #2</h2>
                <div class="image-wrap">
                    <img src="<?php echo $imgUrl;?>/slider1-image.png">    
                <div>
            </li>
            <li class="slides">
                <h2 class="slider-content-title">Engineering #3</h2>
                <div class="image-wrap">
                    <img src="<?php echo $imgUrl;?>/slider1-image.png">    
                <div>
            </li>
            <li class="slides">
                <h2 class="slider-content-title">Engineering #4</h2>
                <div class="image-wrap">
                    <img src="<?php echo $imgUrl;?>/slider1-image.png">    
                <div>
            </li>
        </ul>
    </div>
</div>
</section>

<!-- Our products -->
<section class="product-section align-center">
    <div class="row">
        <h2 class="section-title small-12 large-12 product">Products</h2>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-1.png"></div>
                <h4 class="product-title">Table Cover</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-2.png"></div>
                <h4 class="product-title">Brochure Stands</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-3.png"></div>
                <h4 class="product-title">Hanging Signs</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-4.png"></div>
                <h4 class="product-title">Counters</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-5.png"></div>
                <h4 class="product-title">Display Archs</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-6.png"></div>
                <h4 class="product-title">Flying Flags</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-7.png"></div>
                <h4 class="product-title">Pop up A-Frames</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-8.png"></div>
                <h4 class="product-title">Tension Fabric Walls</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-9.png"></div>
                <h4 class="product-title">SEG Fabric Frame</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-9.png"></div>
                <h4 class="product-title">Fabric Prints</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-11.png"></div>
                <h4 class="product-title">Adjustable Backdrops</h4>
            </div>
        </a>
        <a href="#" class="product-item small-6 medium-4 large-2">
            <div class="product-item-wrap">
                <div class="product-icon-wrap"><img src="<?php echo $imgUrl;?>/product-icon-12.png"></div>
                <h4 class="product-title">Banner Stands</h4>
            </div>
        </a>
    </div>
</section>

<!-- Our works -->
<section class="our-works">
    <div class="row align-middle">
        <div class="columns small-12 medium-6 large-4 text-center works-main">
            <h2 class="our-works-title section-title">Our Works</h2>
            <p class="our-works-des">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummytext </p>
        </div>
        <div class="columns small-12 medium-6 large-4 text-center galary-item padding-top">
            <img src="http://via.placeholder.com/380x280">
        </div>
        <div class="columns small-12 medium-6 large-4 text-center galary-item">
            <img src="http://via.placeholder.com/380x280">
        </div>
        <div class="columns small-12 medium-6 large-4 text-center galary-item">
            <img src="http://via.placeholder.com/380x280">
        </div>
        <div class="columns small-12 medium-6 large-4 text-center galary-item">
            <img src="http://via.placeholder.com/380x280">
        </div>
        <div class="columns small-12 medium-6 large-4 text-center galary-item">
            <img src="http://via.placeholder.com/380x280">
        </div>
    </div>
</section>

<!-- About -->
<section class="about">
    <div class=row>
        <div></div>
        <div class="columns small-12 large-12">
           <h2 class="section-title">About</h2>
        </div>
        <div class="columns small-12 medium-6">
            <img src="<?php echo $imgUrl;?>/about.jpg">
        </div>
        <div class="columns small-12 medium-6 about-des">
            <h3 class="about-des-title">Design, Create, Delivery</h3>
            <ul>
                <li>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummytext Lorem Ipsum has been the </li>
                <li>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the Lorem Ipsum is simply dummy text of the printing and typesetting industry. </li>
            </ul>

            <div class="contact-us-wrap">
                <a href="#" class="button contact-us">Contact Us</a>
                <div class="contact-item">
                    <i class="fa fa-phone" aria-hidden="true"></i>
                    <span>+86-20-83180820</span>
                </div>
            </div>
        </div>

    </div>
</section>

<!-- Our team -->
<section class="our-team">
    <div class="row">
        <div class="columns small-12">
            <h2 class="section-title">Our Team</h2>
        </div>
    </div>
    <div class="row team-row">
        <div class="columns small-12 medium-4 large-3 text-center team-item">
            <img src="http://via.placeholder.com/248x248">
            <h4 class="team-name">Mike Plant</h4>
            <p class="team-role">Lorem Ipsum is </p>
        </div>
        <div class="columns small-12 medium-4 large-3 text-center team-item">
            <img src="http://via.placeholder.com/248x248">
            <h4 class="team-name">Mike Plant</h4>
            <p class="team-role">Lorem Ipsum is </p>
        </div>
        <div class="columns small-12 medium-4 large-3 text-center team-item">
            <img src="http://via.placeholder.com/248x248">
            <h4 class="team-name">Mike Plant</h4>
            <p class="team-role">Lorem Ipsum is </p>
        </div>
        <div class="columns small-12 medium-4 large-3 text-center team-item">
            <img src="http://via.placeholder.com/248x248">
            <h4 class="team-name">Mike Plant</h4>
            <p class="team-role">Lorem Ipsum is </p>
        </div>
        <div class="columns small-12 medium-4 large-3 text-center team-item">
            <img src="http://via.placeholder.com/248x248">
            <h4 class="team-name">Mike Plant</h4>
            <p class="team-role">Lorem Ipsum is </p>
        </div>
        <div class="columns small-12 medium-4 large-3 text-center team-item">
            <img src="http://via.placeholder.com/248x248">
            <h4 class="team-name">Mike Plant</h4>
            <p class="team-role">Lorem Ipsum is </p>
        </div>
        <div class="columns small-12 medium-4 large-3 text-center team-item">
            <img src="http://via.placeholder.com/248x248">
            <h4 class="team-name">Mike Plant</h4>
            <p class="team-role">Lorem Ipsum is </p>
        </div>
    </div>
</section>

<!-- FAQ -->
<section class="faq-section">
    <div class="row">
        <div class="columns samll-12 medium-6 large-6">
            <h2 class="section-title">FAQ</h2>
            <p class="faq-des">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummytext Lorem Ipsum has been the </p>
        </div>
        <div class="columns small-12 medium-6 large-6 text-center question-mark">
            <i class="fa fa-question-circle-o" aria-hidden="true"></i>
        </div>
        <div class="columns small-12">
            <div class="question">
                <div class="title">
                    <span class="num">1</span>
                    <i class="fa fa-plus" aria-hidden="true"></i>
                    <i class="fa fa-minus" aria-hidden="true"></i>
                    <i class=" icon-cog"></i>Sed est elit posuere ac semper hendrerit neque
                </div>
                <div class="answer">
                    <p>
                        <big>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce velit tortor, dictum in gravida nec, aliquet non lorem. </big>
                    </p>
                    <p>Donec vestibulum justo a diam ultricies pellentesque. Quisque mattis diam vel lacus tincidunt elementum. Sed vitae adipiscing turpis. Aenean ligula nibh, molestie id viverra a, dapibus at dolor. In iaculis viverra neque, ac eleifend ante lobortis id. In viverra ipsum ac eros tristique dignissim. Donec aliquam velit vitae mi dictum.</p>
                </div>
            </div>
            <div class="question">
                <div class="title">
                    <span class="num">2</span>
                    <i class="fa fa-plus" aria-hidden="true"></i>
                    <i class="fa fa-minus" aria-hidden="true"></i>
                    <i class=" icon-cog"></i>Sed est elit posuere ac semper hendrerit neque
                </div>
                <div class="answer">
                    <p>
                        <big>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce velit tortor, dictum in gravida nec, aliquet non lorem. </big>
                    </p>
                    <p>Donec vestibulum justo a diam ultricies pellentesque. Quisque mattis diam vel lacus tincidunt elementum. Sed vitae adipiscing turpis. Aenean ligula nibh, molestie id viverra a, dapibus at dolor. In iaculis viverra neque, ac eleifend ante lobortis id. In viverra ipsum ac eros tristique dignissim. Donec aliquam velit vitae mi dictum.</p>
                </div>
            </div>
            <div class="question">
                <div class="title">
                    <span class="num">3</span>
                    <i class="fa fa-plus" aria-hidden="true"></i>
                    <i class="fa fa-minus" aria-hidden="true"></i>
                    <i class=" icon-cog"></i>Sed est elit posuere ac semper hendrerit neque
                </div>
                <div class="answer">
                    <p>
                        <big>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce velit tortor, dictum in gravida nec, aliquet non lorem. </big>
                    </p>
                    <p>Donec vestibulum justo a diam ultricies pellentesque. Quisque mattis diam vel lacus tincidunt elementum. Sed vitae adipiscing turpis. Aenean ligula nibh, molestie id viverra a, dapibus at dolor. In iaculis viverra neque, ac eleifend ante lobortis id. In viverra ipsum ac eros tristique dignissim. Donec aliquam velit vitae mi dictum.</p>
                </div>
            </div>
            <div class="question">
                <div class="title">
                    <span class="num">4</span>
                    <i class="fa fa-plus" aria-hidden="true"></i>
                    <i class="fa fa-minus" aria-hidden="true"></i>
                    <i class=" icon-cog"></i>Sed est elit posuere ac semper hendrerit neque
                </div>
                <div class="answer">
                    <p>
                        <big>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce velit tortor, dictum in gravida nec, aliquet non lorem. </big>
                    </p>
                    <p>Donec vestibulum justo a diam ultricies pellentesque. Quisque mattis diam vel lacus tincidunt elementum. Sed vitae adipiscing turpis. Aenean ligula nibh, molestie id viverra a, dapibus at dolor. In iaculis viverra neque, ac eleifend ante lobortis id. In viverra ipsum ac eros tristique dignissim. Donec aliquam velit vitae mi dictum.</p>
                </div>
            </div>
            <div class="question">
                <div class="title">
                    <span class="num">5</span>
                    <i class="fa fa-plus" aria-hidden="true"></i>
                    <i class="fa fa-minus" aria-hidden="true"></i>
                    <i class=" icon-cog"></i>Sed est elit posuere ac semper hendrerit neque
                </div>
                <div class="answer">
                    <p>
                        <big>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce velit tortor, dictum in gravida nec, aliquet non lorem. </big>
                    </p>
                    <p>Donec vestibulum justo a diam ultricies pellentesque. Quisque mattis diam vel lacus tincidunt elementum. Sed vitae adipiscing turpis. Aenean ligula nibh, molestie id viverra a, dapibus at dolor. In iaculis viverra neque, ac eleifend ante lobortis id. In viverra ipsum ac eros tristique dignissim. Donec aliquam velit vitae mi dictum.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Contact us -->
<section class="contact">
    <div class="row">
        <div class="columns small-12 medium-6 large-6 contact-wrap">
            <h2 class="slider-content-title">Contact Us</h2>
            <div class="contact-address">No.290 Huangbiannan Road,Baiyun,Guangzhou,China 510440</div>
            <div class="contact-item phone"><i class="fa fa-phone-square" aria-hidden="true"></i><span>+86-20-83180820</span></div>
            <div class="contact-item mail"><i class="fa fa-envelope" aria-hidden="true"></i><span>sales@volumeless.com</span></div>
        </div>
        <div class="columns small-12 medium-6 large-6 contact7-wrap">
            <div class="contact-form-column-inner">
                <?php echo do_shortcode('[contact-form-7 id="19" title="Contact form 1"]'); ?>
            </div>
        </div>
    </div>
</section>


<?php get_footer();?>