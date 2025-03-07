$(document).ready(function() {
    $(".space-c").click(function() {
    $(".space-c").removeClass("border-active"); 
    $(this).addClass("border-active"); 

    for (let i = 0; i<2; i++){
        $(".space-c"+ i).css("display", "none");
    }
    var index = $(this).index();
    $(".space-c"+index).css("display", "block");

    });
});