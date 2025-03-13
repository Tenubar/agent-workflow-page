$(document).ready(function() {

  $("#close-btn").click(function () {
    $(".container").toggleClass("collapsed");
  });

  $(".space-b").click(function() {
  $(".space-b").removeClass("active"); 
  $(this).addClass("active"); 

  for (let i = 0; i<2; i++){
      $(".space-b"+ i).css("display", "none");
  }
  var index = $(this).index();
  $(".space-b"+index).css("display", "block");

  });

  // Workflow Forms
  $("#workflow-0").click(function() {
      $(".workflow-id-0").css("display","block");
      $("#formContainer").fadeIn();
      $("#overlay").fadeIn();
  });

  $("#workflow-1").click(function() {
    $(".workflow-id-1").css("display","block");
    $("#formContainer").fadeIn();
    $("#overlay").fadeIn();
  });

  $("#workflow-2").click(function() {
    $(".workflow-id-2").css("display","block");
    $("#formContainer").fadeIn();
    $("#overlay").fadeIn();
  });

  $("#workflow-3").click(function() {
    $(".workflow-id-3").css("display","block");
    $("#formContainer").fadeIn();
    $("#overlay").fadeIn();
  });

  $("#cancelButton").click(function() {
      $("#formContainer").hide();
      $("#overlay").hide();
  });

  $("#overlay").click(function() {
      $("#formContainer").hide();
      $("#overlay").hide();
      for(let i = 0; i<4; i++){
        $(".workflow-id-" + i).css("display","none");
      }
  });

  $("#generateButton").click(function() {
      var blogTopic = $("#blogTopic").val();
      var targetKeywords = $("#targetKeywords").val();
      var wordCount = $("#wordCount").val();
      var contentGoal = $("#contentGoal").val();

      console.log("Blog Topic: " + blogTopic);
      console.log("Target Keywords: " + targetKeywords);
      console.log("Word Count: " + wordCount);
      console.log("Content Goal: " + contentGoal);
      $("#formContainer").fadeOut();
      $("#overlay").fadeOut();
  });

$('.contact-user').click(function(){
  window.open('/chat', '_blank');
})

});



