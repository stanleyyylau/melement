## 使用说明
+ 引用CSS样式
+ 引用jq插件
+ 添加html结构（参考html格式要求，自己加入个性化html）
+ 加入你自己的自定义样式(插件为了保证定制化,不会写太多默认样式，你需要自己写)
+ $('.slider-viewport').slider() 激活插件, 5个可传配置项目，具体看插件配置

``要求html格式``
```
<div class="slider-viewport">
    <div class="slides-container">
        <div class="slides">
            第一页
        </div>

        <div class="slides">
            第二页
        </div>

        <div class="slides">
            第三页
        </div>

        <div class="slides">
          第四页
        </div>
    </div>
</div>

<div class="control-btns">
    <a class="slider-back">上一页</a>
    <a class="slider-forward">下一页</a>
</div>

```

## 插件配置
+ ``sliderViewport``  数字类型，轮播的宽度/不传此参数默认是780 (配置了这个就不要配置响应式)
+ ``isResponsive``   true/false 是否要响应式 (配置了轮播宽度就不要配置这个)
+ ``playPerSecond``  数字类型  多少毫秒后自己播放下一张(不传默认是不自动播放)
+ ``isFadeIn``       true/false  是否需要渐变效果(不传参数默认是左右滑动)
+ ``doItAfterEachSlide``  回调函数 (每一张轮播播放完之后执行的回调函数,接受``index``为参数, ``index``是轮播的序号)


## 使用例子

**参考demo**

#### 默认参数
```
$('.slider-viewport').slider()

```

#### 自定义
```
$('.slider-viewport').slider({
  isResponsive: true,
  playPerSecond: 3000,
  isFadeIn: true,
  doItAfterEachSlide: function(index){
    var currentSlide = Number(index+1);
    console.log('当前的轮播是第 ' + currentSlide +' 张');
  }
  })

```
