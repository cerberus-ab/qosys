;(function(){

    $(window).load(function(){

        $("#model_list").delegate("li:not(.selected)", "click", function(event) {
            $("#model_list li").removeClass("selected");
            $(this).addClass("selected");
        });

        $("#model_list li:first").click();

    });

})();
