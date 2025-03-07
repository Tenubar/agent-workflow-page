$(document).ready(function() {
    $(".space-d").click(function() {
    $(".space-d").removeClass("active"); 
    $(this).addClass("active"); 

    for (let i = 0; i<4; i++){
        $(".space-d"+ i).css("display", "none");
    }
    var index = $(this).index();
    $(".space-d"+index).css("display", "block");

    });

    $(document).on("click", "input", function() {
        this.classList.add("selected");
    });

    $(document).on("blur", "input", function() {
        this.classList.remove("selected");
    });

});