var usr_email = $("#usr_email").val();

function removeItem(id) {
  if (!confirm("Delete this post?")) {
    return false;
  }
  var url = "remove_post";
  var formData = {
    id: id,
  };
  $.post(url, formData, function (blog_data) {
    loadDoc(blog_data);
  });
}
$(document).ready(function () {
  (function () {
    $.getJSON("post_db", tweet_table);
  })();
});
$("#PostForm").submit(function (event) {
  // prevent default html form submission action
  event.preventDefault();

  // pack the inputs into a dictionary
  var formData = {};
  $(":input").each(function () {
    var key = $(this).attr("name");
    var val = $(this).val();

    if (key != "submit") {
      formData[key] = val;
    }
  });
  var $form = $(this);
  var url = $form.attr("action");

  // make a POST call to the back end w/ a callback to refresh the table
  $.post(url, formData, function (blog_data) {
    loadDoc(blog_data);
    clearForm();
  });
});

function clearForm() {
  $("#PostForm")[0].reset();
  $("#entryid").val("");
}

function get_user(owner_id) {
  return new Promise((resolve, reject) => {
    $.getJSON(`/user/${owner_id}`, function (data) {
      resolve(data);
    }).fail(function () {
      reject(new Error("Failed to retrieve user data."));
    });
  });
}

async function tweet_table(blog_data) {
  const data = {
    tweet: blog_data,
  };

  async function createTweetHTML({
    id,
    message,
    date_created,
    date_updated,
    owner_id,
  }) {
    const date_full = Date(date_created + "UTC");
    let date_post = cal_minutes(date_created);
    let date_edit = cal_minutes(date_updated);
    let oldDate = new Date(date_created);
    let editDate = new Date(date_updated);
    let user_id;

    try {
      user_id = await get_user(owner_id);
      console.log(user_id);
    } catch (error) {
      console.error(error);
      return;
    }

    let name = user_id["name"];
    let email = user_id["email"];
    let avatar_url = user_id["avatar_url"];

    console.log(name, email, avatar_url);
    if (oldDate.getUTCSeconds() === editDate.getUTCSeconds()) {
      return post_blog(
        id,
        name,
        message,
        email,
        date_post,
        date_full,
        avatar_url
      );
    } else {
      return edit_Blog(
        id,
        name,
        message,
        email,
        date_post,
        date_edit,
        date_full,
        avatar_url
      );
    }
  }
  const tweet = await Promise.all(data.tweet.map(createTweetHTML));

  // And add it for each HTML template to the body.
  const tweetPromises = data.tweet.map(createTweetHTML);
  Promise.all(tweetPromises).then((tweetValues) => {
    // tweetValues will be an array of resolved values
    tweetValues.forEach((tweet) => {
      document.getElementById("blog-data").innerHTML =
        tweet + document.getElementById("blog-data").innerHTML;
    });
  });
}

function post_blog(id, name, message, email, date_post, date_full, avatar_url) {
  return `<div class="row" id="post-tweet">
        <div class="col-md-2 text-center" id="picture">
            <img class="tw-user-medium rounded-circle" id="avatar_url${id}" src="${avatar_url}" alt="">
        </div>
        <div class="col-md-10" id="blog-data">
            <div class="row tweet-info">
                <div class="col-md-auto">
                    <span class="twitter-id" id="id-blog" hidden="hidden">${id}</span>
                    <span class="name" id="name${id}">${name}</span>
                    <span class="email" id="email${id}"> ${email}</span>
                    <span class="tweet-age" data-text="${date_full}"> · ${date_post}</span>
                </div>
                <div class="col tweet-arrow text-muted">
                    <div class="dropdown" >
                    <i class="fa-solid fa-ellipsis float-right" onclick="showDropdownMenu(event)"></i>
                    <div class="dropdown-menu" id ="dropdown_item" style="margin-left:100%;">
                        ${
                          usr_email === email
                            ? `<a class="dropdown-item" href="javascript:void(0) "onclick="prePopulateForm(${id})" >
                                <i class="fa-solid fa-pen" ></i>
                                edit
                            </a>
                            <a class="dropdown-item" href="javascript:void(0)" onclick="removeItem(${id})">
                                <i class="fa-solid fa-trash"></i>
                                delete
                            </a>`
                            : `<a id="sent_mail" class="dropdown-item" href="mailto: ${email}">
                                <i class="fa-solid fa-envelope"></i>
                                sent mail
                            </a>`
                        }
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-auto" id="message${id}">${message}</div>               
        </div>
        <div class="row text-muted">
            <div class="icon">
                
            </div>
        </div>
        
    </div>`;
}

function edit_Blog(
  id,
  name,
  message,
  email,
  date_post,
  date_edit,
  date_full,
  avatar_url
) {
  return `<div class="row" id="post-tweet">
        <div class="col-md-2 text-center" id="picture">
            <img class="tw-user-medium rounded-circle" id="avatar_url${id}" src="${avatar_url}" alt="">
        </div>
        <div class="col-md-10" id="blog-data">
            <div class="row tweet-info">
                <div class="col-md-auto">
                    <span class="twitter-id" id="id-blog" hidden="hidden">${id}</span>
                    <span class="name" id="name${id}">${name}</span>
                    <span class="email" id="email${id}">${email}</span>
                    <span class="tweet-age" data-text="${date_full} (Edited ${date_edit} ago)"> · ${date_post} (edited)</span>
                    </div>
                <div class="col tweet-arrow text-muted">
                <div class="dropdown" >
                    <i class="fa-solid fa-ellipsis float-right" onclick="showDropdownMenu(event)"></i>
                    <div class="dropdown-menu" id ="dropdown_item" style="margin-left:100%">
                        ${
                          usr_email === email
                            ? `<a class="dropdown-item" href="javascript:void(0) "onclick="prePopulateForm(${id})" >
                                <i class="fa-solid fa-pen" ></i>
                                edit
                            </a>
                            <a class="dropdown-item" href="javascript:void(0)" onclick="removeItem(${id})">
                                <i class="fa-solid fa-trash"></i>
                                delete
                            </a>`
                            : `<a id="sent_mail" class="dropdown-item" href="mailto: ${email}">
                                <i class="fa-solid fa-envelope"></i>
                                sent mail
                            </a>`
                        }
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-auto" id="message${id}">${message}</div>               
        </div>
        <div class="row text-muted">
            <div class="icon">
            </div>
        </div>
    </div>`;
}

function loadDoc(blog_data) {
  document.getElementById("blog-data").innerHTML = "";
  document
    .getElementById("blog-data")
    .addEventListener("load", tweet_table(blog_data));
}

function showDropdownMenu(event) {
  var dropdown = event.target.nextElementSibling;
  if (dropdown.style.display === "block") {
    dropdown.style.display = "none";
  } else {
    dropdown.style.display = "block";
  }
  document.addEventListener("click", function (event) {
    if (!event.target.matches(".fa-ellipsis")) {
      dropdown.style.display = "none";
    }
  });
}

function cal_minutes(date_create) {
  let now = new Date();
  let created = new Date(date_create + " UTC");
  let diff = (now.getTime() - created) / 1000 / 60; // convert to minutes
  diff = Math.abs(Math.round(diff)); // round and get absolute value

  let result;
  if (diff >= 60 && diff < 1440) {
    result = Math.round(diff / 60) + " hours";
  } else if (diff >= 1440) {
    result = new Date(date_create).toLocaleDateString().split(",")[0];
  } else if (diff <= 1) {
    result = "now";
  } else {
    result = diff + " minutes";
  }
  return result;
}

function prePopulateForm(id) {
  $("#PostForm")[0].reset();
  $("#message").val(document.getElementById("message" + id).innerHTML);
  $("#entryid").val(id);
}

function report() {
  confirm("Do you want to report this pose?");
}
