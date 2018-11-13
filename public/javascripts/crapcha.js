var crapcha = {

  init: function($el) {

    var html = '<div class="code"></div><div class="control"><input required type="text" maxlength="20" placeholder="Type the text above"></input><label><span class="fa fa-sync reload btn"></span><a class="fa fa-info info btn" href="https://captcha.net" target="_blank" tabindex="-1"></a> <span class="logo">C A P T C H A<sup>&trade;</sup></span></label></div>';

    $el.append(html)
      .children('.control')
        .children('input').keypress(this.send).end()
        .find('.reload').css('user-select', 'none').click(function(){
          crapcha.populate($el);
        });

    this.populate($el);

  },

  populate: function($el) {

    var $code = $el.children('.code'),
      captcha = this.generate(5);

    $code.empty();

    for (var i = 0; i < captcha.length; i++) {

      if (captcha[i].length === 5) {
        // unicode
        $code.append('<span>&#x' + captcha[i] + ';</span>');
      } else if (captcha[i].length === 3) {
        // font-awesome
        $code.append('<span class="icon-' + captcha[i] + '"></span>');
      }
    }

    $code.children().each(this.distort);
  },

  generate: function(length) {

    var captcha = [],
      t,
      r;

    for (var i = 0; i < length; i++) {

      r = Math.random();

      if (r > 0.4) {
        // unicode
        t = this.randomize(382).toString(16);
        t = this.pad([t, 5]);
      } else if (r > 0.2) {
        // unicode
        t = this.randomize(12351).toString(16);
        t = this.pad([t, 5]);
      } else {
        // font-awesome
        t = this.randomize(270).toString(15);
        t = this.pad([t, 3]);
      }

      captcha.push(t);
    }

    return captcha;
  },

  distort: function(i) {

    var length = $(this).parent().children().length,
      size = parseInt($(this).parent().height(), 10);

    $(this).css({
      'left': 8 + (100 * i / length) + '%',
      'position': 'absolute',
      'font-size': size - crapcha.randomize(20) + 'px',
      'transform': 'rotateY(' + crapcha.randomize(70) + 'deg) rotate(' + crapcha.randomize(360) + 'deg)',
      'user-select': 'none'
    });
  },

  send: function(e) {

    if (e.which === 13) {

      if (($(this).val()) && ($(this).val() !== crapcha.attempt)) {

        crapcha.attempt = $(this).val().substring(0, 20);
        var $captcha = $(this).parent().parent().children('.code');

        if (($captcha.children('span').size() === $captcha.find('*').size()) && ($captcha.find('[onload], [onunload], [onclick], [onmouseover], [onmouseout], [onmousedown], [onmouseup], [onkeypress], [onerror], [background], meta, img, svg, script, link, style, iframe, input').size() === 0)) {

          
        }

        $(this).val('');

        crapcha.populate($(this).parent().parent());
      }
    }
  },

  randomize: function(max) {
    return Math.floor((Math.random()) * max);
  },

  pad: function(arg) {
    var s = '00000' + arg[0];
    return s.substr(s.length - arg[1]);
  }
};

crapcha.init($('.crapcha'));