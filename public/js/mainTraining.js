$(document).ready(function() {

    $("#close-btn").click(function () {
        $(".container").toggleClass("collapsed");
    });

    $(".space-a").click(function() {
    $(".space-a").removeClass("active"); 
    $(this).addClass("active"); 

    for (let i = 0; i<2; i++){
        $(".space-a"+ i).css("display", "none");
    }
    var index = $(this).index();
    $(".space-a"+index).css("display", "block");

    });

    $(".add-avatar").click(function(){
        document.createElement()
    });


});

$(document).ready(function() {
    $(".dropdown-flex").click(function() {  // Changed selector here
        $(".dropdown-menu").toggle();
    });

    $(".dropdown-menu li span").click(function(event) {
        event.preventDefault();
        var selectedValue = $(this).text();
        $(".dropdown-button").text(selectedValue);
        $(".dropdown-menu").hide();
    });

    $(document).click(function(event) {
        if (!$(event.target).closest(".dropdown").length) {
            $(".dropdown-menu").hide();
        }
    });


    // Add Avatar

    // (function() {
    //     const createFormBtn = document.getElementById('add-avatar');
    //     const formContainer = document.getElementById('form-container-avatar');
    //     let currentForm = null;

    //     function createForm() {
    //         if (currentForm) return;

    //         // Form container
    //         const form = document.createElement('div');
    //         form.className = 'form-container';
    //         form.style.display = 'block';

    //         // Close button
    //         const closeBtn = document.createElement('button');
    //         closeBtn.className = 'close-btn';
    //         closeBtn.innerHTML = '&times;';
    //         closeBtn.onclick = () => {
    //             form.remove();
    //             currentForm = null;
    //         };

    //         // Form grid
    //         const formGrid = document.createElement('div');
    //         formGrid.className = 'form-grid';

    //         // Row 1
    //         const row1 = createRow(
    //             createInputGroup('Name', 'text', 'name'),
    //             createInputGroup('Age Range', 'select', 'ageRange', {
    //                 options: ['18-25', '26-35', '36-45', '46+']
    //             })
    //         );

    //         // Row 2
    //         const row2 = createRow(
    //             createInputGroup('Occupation', 'text', 'occupation'),
    //             createInputGroup('Challenges', 'textarea', 'challenges')
    //         );

    //         // Row 3 (full width)
    //         const row3 = document.createElement('div');
    //         row3.className = 'input-group';
    //         row3.style.gridColumn = '1 / -1';
    //         row3.appendChild(createInputGroup('Goals', 'textarea', 'goals'));

    //         // Submit button
    //         const submitBtn = document.createElement('button');
    //         submitBtn.type = 'button';
    //         submitBtn.textContent = 'Submit';
    //         submitBtn.style.cssText = `
    //             background: #10b981;
    //             color: white;
    //             border: none;
    //             padding: 0.8rem 1.5rem;
    //             border-radius: 4px;
    //             cursor: pointer;
    //             margin-top: 1rem;
    //         `;
    //         submitBtn.onclick = () => {
    //             const formData = {
    //                 name: document.getElementById('name').value,
    //                 occupation: document.getElementById('occupation').value,
    //                 ageRange: document.getElementById('ageRange').value,
    //                 challenges: document.getElementById('challenges').value,
    //                 goals: document.getElementById('goals').value
    //             };
    //             console.log('Form Data:', formData);
    //             form.remove();
    //             currentForm = null;
    //         };

    //         // Assemble form
    //         formGrid.append(...row1.children, ...row2.children, row3);
    //         form.append(closeBtn, formGrid, submitBtn);
    //         formContainer.appendChild(form);
    //         currentForm = form;
    //     }

    //     function createRow(...groups) {
    //         const row = document.createElement('div');
    //         row.className = 'form-row';
    //         groups.forEach(group => row.appendChild(group));
    //         return row;
    //     }

    //     function createInputGroup(labelText, type, id, options = {}) {
    //         const group = document.createElement('div');
    //         group.className = 'input-group';

    //         const label = document.createElement('label');
    //         label.textContent = labelText;
    //         label.htmlFor = id;

    //         let input;
    //         if (type === 'textarea') {
    //             input = document.createElement('textarea');
    //             input.id = id;
    //         } else if (type === 'select') {
    //             input = document.createElement('select');
    //             input.id = id;
    //             options.options.forEach(opt => {
    //                 const option = document.createElement('option');
    //                 option.value = opt;
    //                 option.textContent = opt;
    //                 input.appendChild(option);
    //             });
    //         } else {
    //             input = document.createElement('input');
    //             input.type = type;
    //             input.id = id;
    //         }

    //         group.appendChild(label);
    //         group.appendChild(input);
    //         return group;
    //     }

    //     createFormBtn.addEventListener('click', createForm);
    // })();

});