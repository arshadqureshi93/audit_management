// Custom script for "My Audits" doctype

frappe.ui.form.on('My Audits', {
    query_box: function(frm) {
        // Enforce capitalization for query_box field
        frm.doc.query_box = frm.doc.query_box.toUpperCase();
        frm.refresh_field('query_box');
    },
    response_box: function(frm) {
        // Enforce capitalization for query_box field
        frm.doc.response_box = frm.doc.response_box.toUpperCase(); 
        frm.refresh_field('response_box');
    },
    reporting_person_response_box: function(frm) {
        // Enforce capitalization for query_box field
        frm.doc.reporting_person_response_box = frm.doc.reporting_person_response_box.toUpperCase();
        frm.refresh_field('reporting_person_response_box');
    },
    higher_reporting_person_response_box: function(frm) {
        // Enforce capitalization for query_box field
        frm.doc.higher_reporting_person_response_box = frm.doc.higher_reporting_person_response_box.toUpperCase();
        frm.refresh_field('higher_reporting_person_response_box');
    },
        before_save: function(frm) {
        // If the status is blank, set it to "Draft" before saving
        if (!frm.doc.status) {
            frm.set_value("status", "Draft");
            frm.refresh_field("status");
        }

        // Check if branch and employee_details are not empty before saving
        if (!frm.doc.branch || !frm.doc.employee_details) {
            frappe.msgprint('<b>Before saving, First input Branch and select Employee.</b>');
            frappe.validated = false;
            return;
        }

        // Check if query_box is not empty before saving
        if (!frm.doc.query_box) {
            frappe.msgprint('<b>Before saving, First input your queries in the Query Box.</b>');
            frappe.validated = false;
            return;
        }
    },
    
    branch: function(frm) {
        // Get the selected branch value
        var selected_branch = frm.doc.branch;
        // Apply filter to employee_details field based on the selected branch
        frm.set_query('employee_details', function() {
            return {
                filters: {
                    branch: selected_branch
                }
            };
        });
        // Clear the employee_details field if branch is changed
        frm.set_value('employee_details', null);
    },
    
    refresh: function(frm) {

        if (frm.is_new()) {
            console.log("new");
            // When form is new
            // Setting Employee ID
            let auditor_user = frappe.session.user;
            let auditor_user_emp_id = auditor_user.match(/\d+/)[0];
            console.log("Employee ID:", auditor_user_emp_id);
        
            frm.call({
                method: "fetch_employee_data",
                args: {
                    employee_id: auditor_user_emp_id,
                },
                callback: function (r) {
                    if (!r.exc) {
                        // Accessing response data
                        const employeeData = r.message[0]; // Accessing the first element of the array
                        console.log("Employee Data:", employeeData);
        
                        // Set emp_full_name field with employee's name
                        frm.set_value("query_generated_by_name", employeeData.employee_name);
                        console.log(frm.doc.query_generated_by_name)
                        frm.refresh_field("query_generated_by_name");
                        
                        frm.set_value("query_generated_by_designation", employeeData.designation);
                        console.log(frm.doc.query_generated_by_designation)
                        frm.refresh_field("query_generated_by_designation");

                        frm.set_value("query_generated_by_branch", employeeData.branch);
                        console.log(frm.doc.query_generated_by_branch)
                        frm.refresh_field("query_generated_by_branch");
                    } else {
                        console.error("Error fetching employee data", r.exc);
                    }
                },
                error: function (err) {
                    console.error("Failed to fetch employee data", err);
                },
            });
        }        

        if(frm.doc.status!="Draft")
            {
                $(frm.fields_dict.enter_employee_details_section.wrapper).find('.section-head').html('Employee Details :');
            }

        // Check if user has the role "Audit Manager" and document status is "Draft"
        if (frappe.user.has_role("Audit Manager") && frm.doc.status === "Draft") {
            // Disable the form to prevent editing
            frm.disable_form();
            
            // Add custom button "Send to Employee"
            frm.add_custom_button('Send to Employee', function() {
                // Log button click for debugging
                console.log('Send to Employee button clicked!');
                
                // Get the employee_id from the form
                let employee_id = frm.doc.employee_details;
                if (!employee_id) {
                    // Handle case where employee_details is not available
                    frappe.msgprint("Employee details not found.");
                    return;
                }
                
                // Fetch user_id from Employee doctype
                frappe.db.get_value('Employee', { 'employee': employee_id }, 'user_id', function(response) {
                    let user_id = response.user_id;
                    frm.doc.current_person_id=user_id;

                
                    // Now share the document with the user_id
                    frappe.confirm(
                        "<i>Do you want to send request to Employee ?</i>",
                        () => {
                            // Action to perform if Yes is selected
                            frappe.call({
                                method: "frappe.share.add",
                                freeze: true, // Freeze the UI during the request
                                freeze_message: "Internet Not Stable, Please Wait...",
                                args: {
                                    doctype: frm.doctype,
                                    name: frm.docname,
                                    user: frm.doc.current_person_id,
                                    read: 1,
                                    write: 1,
                                    submit: 0,
                                    share: 1,
                                    notify: 1,
                                    send_email: 0, // Prevent sending email notifications
                                },
                                callback: function(response) {
                                    // Display a success message to the user
                                    frappe.show_alert({
                                        message: "Your Approval Request Sent Successfully",
                                        indicator: "green",
                                    });
                                    // Update the document status if still in "Draft"
                                    if (frm.doc.status === "Draft") {
                                        frm.set_value("status", "Pending From Employee");
                                        frm.set_df_property("branch", "read_only", 1);
                                        frm.set_df_property("employee_details", "read_only", 1);
                                        frm.save(); // Ensure the form is saved
                                        frm.refresh_fields();
                                    }
                                },
                            });
                        },
                        () => {
                            // Action to perform if No is selected (optional)
                        }
                    );
                });
            })
            .css({
                "background-color": "#28a745", // Set green color
                color: "#ffffff", // Set font color to white
            });
        }     
        if (frappe.user.has_role("Audit Manager") && frm.doc.status === "Pending From Employee") {
            frm.disable_form();
        }
        
        if (frappe.user.has_role("Employee") && frm.doc.status === "Pending From Auditor") {
            frm.disable_form();
        }
        
        if (frappe.user.has_role("Audit Manager") && frm.doc.status === "Pending From Auditor") {

            // frm.set_intro('Please review the response and choose an action:<br>' +
            //     'If you\'re satisfied with employee Response, then Click <b>Satisfied</b>.<br>' +
            //     'If you\'re not satisfied and want employee\'s reporting person response, then Click <b>Forward to Reporting</b>.');

            // Add custom buttons "Satisfied" and "Not Satisfied"
            if(frm.doc.higher_reporting_person_id)
                {
                    frm.add_custom_button('Satisfied', function() {
                        // Your custom button logic here for "Satisfied"
                        // This function will be executed when the "Satisfied" button is clicked
                        if(frm.doc.status==="Pending From Auditor")
                            {
                                frm.set_value("status", "Satisfied");
                                frm.refresh_field("status");
                                frm.save(); // Save the form to update the status
                                frm.disable_form();
                            }
                    })
                    .css({
                        "background-color": "#28a745", // Set green color
                        color: "#ffffff", // Set font color to white
                    });
                }
            else
            {
                frm.add_custom_button('Satisfied', function() {
                    // Your custom button logic here for "Satisfied"
                    // This function will be executed when the "Satisfied" button is clicked
                    if(frm.doc.status==="Pending From Auditor")
                        {
                            frm.set_value("status", "Satisfied");
                            frm.refresh_field("status");
                            frm.save(); // Save the form to update the status
                            frm.disable_form();
                        }
                })
                .css({
                    "background-color": "#28a745", // Set green color
                    color: "#ffffff", // Set font color to white
                });
                if(!frm.doc.reporting_person_id){
                    frm.add_custom_button('Forward to Reporting', function() {
                        let employee_id = frm.doc.employee_details;
                        if (!employee_id) {
                            // Handle case where employee_details is not available
                            frappe.msgprint("Employee details not found.");
                            return;
                        }
                        
                        // Fetch user_id from Employee doctype
                        frappe.db.get_value('Employee', { 'employee': employee_id }, 'reporting_employee_user_id', function(response) {
                            let reporting_employee_user_id = response.reporting_employee_user_id;
                            frm.doc.reporting_person_id=reporting_employee_user_id;
                            
                            // Now share the document with the user_id
                            frappe.confirm(
                                "<i>If you are not satisfied with Employee response then you can send this document to Employee's reporting person for your required information , <br><b>Do you want to send this document to Employee's reporting person ?</b></i>",
                                () => {
                                    // Action to perform if Yes is selected
                                    frappe.call({
                                        method: "frappe.share.add",
                                        freeze: true, // Freeze the UI during the request
                                        freeze_message: "Internet Not Stable, Please Wait...",
                                        args: {
                                            doctype: frm.doctype,
                                            name: frm.docname,
                                            user: frm.doc.reporting_person_id,
                                            read: 1,
                                            write: 1,
                                            submit: 0,
                                            share: 1,
                                            notify: 1,
                                            send_email: 0, // Prevent sending email notifications
                                        },
                                        callback: function(response) {
                                            // Display a success message to the user
                                            frappe.show_alert({
                                                message: "Your Approval Request Sent Successfully",
                                                indicator: "green",
                                            });
                                            // Update the document status if still in "Draft"
                                            if (frm.doc.status === "Pending From Auditor") {
                                                frm.set_value("status", "Pending From Reporting");
                                                frm.refresh_field("status");
                                                frm.save();
                                            }
                                        },
                                    });
                                },
                                () => {
                                    // Action to perform if No is selected (optional)
                                }
                            );
                        });
                    })
                    .css({
                        "background-color": "#dc3545", // Set red color
                        "color": "#ffffff" // Set font color to white
                    }); 
                }
                else if(frm.doc.reporting_person_id)
                    {
                        frm.add_custom_button('Forward to Higher Reporting', function() {
                            let employee_id = frm.doc.employee_details;
                            if (!employee_id) { 
                                // Handle case where employee_details is not available
                                frappe.msgprint("Employee details not found.");
                                return;
                            }
                            
                            // Fetch user_id from Employee doctype
                            frappe.db.get_value('Employee', { 'employee': employee_id }, 'higher_reporting_employee_user_id', function(response) {
                                let higher_reporting_employee_user_id = response.higher_reporting_employee_user_id;
                                frm.doc.higher_reporting_person_id=higher_reporting_employee_user_id;
                                
                                // Now share the document with the user_id
                                frappe.confirm(
                                    "<i>If you are not satisfied with Employee & his Reporting person\'s response then you can send this document to Employee's Higher reporting person for your required information , <br><b>Do you want to send this document to Employee's Higher reporting person ?</b></i>",
                                    () => {
                                        // Action to perform if Yes is selected
                                        frappe.call({
                                            method: "frappe.share.add",
                                            freeze: true, // Freeze the UI during the request
                                            freeze_message: "Internet Not Stable, Please Wait...",
                                            args: {
                                                doctype: frm.doctype,
                                                name: frm.docname,
                                                user: frm.doc.higher_reporting_person_id,
                                                read: 1,
                                                write: 1,
                                                submit: 0,
                                                share: 1,
                                                notify: 1,
                                                send_email: 0, // Prevent sending email notifications
                                            },
                                            callback: function(response) {
                                                // Display a success message to the user
                                                frappe.show_alert({
                                                    message: "Your Approval Request Sent Successfully",
                                                    indicator: "green",
                                                });
                                                // Update the document status if still in "Draft"
                                                if (frm.doc.status === "Pending From Auditor") {
                                                    frm.set_value("status", "Pending From Higher Reporting");
                                                    frm.refresh_field("status");
                                                    frm.save();
                                                }
                                            },
                                        });
                                    },
                                    () => {
                                        // Action to perform if No is selected (optional)
                                    }
                                );
                            });
                        })
                        .css({
                            "background-color": "#dc3545", // Set red color
                            "color": "#ffffff" // Set font color to white
                        });
                    }
                    if(frm.doc.higher_reporting_person_id)        
                        {
                            frm.add_custom_button('Satisfied', function() {
                                // Your custom button logic here for "Satisfied"
                                // This function will be executed when the "Satisfied" button is clicked
                                if(frm.doc.status==="Pending From Auditor")
                                    {
                                        frm.set_value("status", "Satisfied");
                                        frm.refresh_field("status");
                                        frm.save(); // Save the form to update the status
                                    }
                            })
                            .css({
                                "background-color": "#28a745", // Set green color
                                color: "#ffffff", // Set font color to white
                            });
                        }
            }
        }
        if(frappe.user.has_role("Employee") && (frm.doc.status === "Pending From Auditor" || frm.doc.status === "Satisfied" ||frm.doc.status === "Not Satisfied" || frm.doc.status === "Pending From Reporting" || frm.doc.status === "Pending From Higher Reporting"))
            {
                frm.set_df_property("query_box", "read_only", 1);
                frm.set_df_property("response_box", "read_only", 1);
                frm.disable_save();
            }
        if(frappe.session.user==frm.doc.reporting_person_id && frm.doc.status=="Pending From Reporting")
            {
                // frm.enable_save();
                frm.set_df_property("branch", "read_only", 1);
                frm.set_df_property("employee_details", "read_only", 1);
                // Add custom button "Send Response" 
            frm.add_custom_button('Send Response', function() {
                // Check if response_box is empty
                if (!frm.doc.reporting_person_response_box) {
                    frappe.msgprint('<b>Before submitting form, First input your response in the Response Box.</b>');
                    frappe.validated = false;
                    return;
                }
                // Display confirmation message
                frappe.confirm(
                    "<i>Do you want to submit your Response ?</i>",
                    function() {
                        // Action to perform if Yes is selected
                        if (frm.doc.status === "Pending From Reporting") {
                            frm.set_value("status", "Pending From Auditor");
                            frm.set_df_property("reporting_person_response_box", "read_only", 1);
                            frm.save(); // Save the form to update the status
                            frm.disable_form();
                        }
                        // Display a success message
                        frappe.show_alert({
                            message: "Response submitted successfully!",
                            indicator: "green"
                        });
                    },
                    function() {
                        // Action to perform if No is selected (optional)
                    }
                );
            })
            .css({
                "background-color": "#28a745", // Set green color
                color: "#ffffff", // Set font color to white
            });
        }

        if(frappe.session.user==frm.doc.higher_reporting_person_id && frm.doc.status=="Pending From Higher Reporting")
            {
                // frm.enable_save();
                frm.set_df_property("branch", "read_only", 1);
                frm.set_df_property("employee_details", "read_only", 1);
                frm.set_df_property("reporting_person_response_box", "read_only", 1);


                // Add custom button "Send Response" 
            frm.add_custom_button('Send Response', function() {
                // Check if response_box is empty
                if (!frm.doc.higher_reporting_person_response_box) {
                    frappe.msgprint('<b>Before submitting form, First input your response in the Response Box.</b>');
                    frappe.validated = false;
                    return;
                }
                // Display confirmation message
                frappe.confirm(
                    "<i>Do you want to submit your Response ?</i>",
                    function() {
                        // Action to perform if Yes is selected
                        if (frm.doc.status === "Pending From Higher Reporting") {
                            frm.set_value("status", "Pending From Auditor");
                            frm.set_df_property("higher_reporting_person_response_box", "read_only", 1);
                            frm.save(); // Save the form to update the status
                            frm.disable_form();
                        }
                        // Display a success message
                        frappe.show_alert({
                            message: "Response submitted successfully!",
                            indicator: "green"
                        });
                    },
                    function() {
                        // Action to perform if No is selected (optional)
                    }
                );
            })
            .css({
                "background-color": "#28a745", // Set green color
                color: "#ffffff", // Set font color to white
            });
        }

        if (!frappe.user.has_role("Audit Manager") && frappe.user.has_role("Employee") && frm.doc.status === "Pending From Employee") {
            // Change the label of the query_section field dynamically
            frm.set_df_property("query_box", "read_only", 1);
            frm.disable_save();

            // Add custom button "Send Response" 
            frm.add_custom_button('Send Response', function() {
                // Check if response_box is empty
                if (!frm.doc.response_box) {
                    frappe.msgprint('<b>Before submitting form, First input your response in the Response Box.</b>');
                    frappe.validated = false;
                    return;
                }
                // Display confirmation message
                frappe.confirm(
                    "<i>Do you want to submit your Response ?</i>",
                    function() {
                        // Action to perform if Yes is selected
                        if (frm.doc.status === "Pending From Employee") {
                            frm.set_value("status", "Pending From Auditor");
                            frm.set_df_property("response_box", "read_only", 1);
                            frm.save(); // Save the form to update the status
                        }
                        // Display a success message
                        frappe.show_alert({
                            message: "Response submitted successfully!",
                            indicator: "green"
                        });
                    },
                    function() {
                        // Action to perform if No is selected (optional)
                    }
                );
            })
            .css({
                "background-color": "#28a745", // Set green color
                color: "#ffffff", // Set font color to white
            });
        }
    }
}); 