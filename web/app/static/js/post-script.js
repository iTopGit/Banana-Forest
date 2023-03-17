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
  console.log("in");
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
    img_id,
    like,
  }) {
    var d1 = new Date(date_created);
    var d2 = new Date(date_updated);
    let post_time = "";
    let current_id = document.getElementById("id_user").innerHTML;
    if (d1.getUTCSeconds() === d2.getUTCSeconds()) {
      post_time = diff_minutes(date_created);
    } else {
      post_time = diff_minutes(date_updated);
    }
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
    console.log(like);

    return post_blog(
      id,
      name,
      message,
      img_id,
      email,
      date_created,
      date_updated,
      post_time,
      avatar_url,
      owner_id,
      current_id,
      like
    );
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

function post_blog(
  id,
  name,
  message,
  img_id,
  email,
  date_created,
  date_updated,
  post_time,
  avatar_url,
  owner_id,
  current_id,
  like
) {
  // console.log(typeof (like));
  let like_val = get_val(like, owner_id);
  let like_check = check_color(like, owner_id);
  //   console.log("like_check : " + like_check);
  //   console.log("like_val : " + like_val);
  return `
    <div class="tweet rounded">
    <div class="row">
        <div class="col-md-2 text-center">
        <img class="tw-user-medium rounded-circle img-fluid user-picture" src="${avatar_url}"/>
        </div>
        <div class="col-md-10">
        <div class="row tweet-info">
            <div class="col-md-auto">
            <span class="tweet-username" id ="name${id}">${name}</span>
            <span class="tweet-usertag text-muted" id ="email${id}">@${email}</span>-
            <span class="tweet-age text-muted" id ="time${id}">${post_time}</span>
            </div>
            <div class="col tweet-arrow text-muted">
            <i class="fi fi-bs-menu-dots-vertical float-right" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" ></i>
            <div class="dropdown-menu">
            ${
              owner_id != current_id
                ? `<button  class="dropdown-item" id="editallButton" onclick="like_blog(${id})">Like</button>
                <button  class="dropdown-item" id="editallButton" onclick="retweet_blog(${id})">Retweet</button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" id="editallButton" onclick="window.open('https://www.youtube.com/watch?v=tG1otG8ncFY&ab_channel=Hemsty', '_blank')">Capyspin</button>
                `
                : `<button  class="dropdown-item" id="editallButton" href="#" data-target="#popup-tweet" data-toggle="modal" value="${id}" onclick="prePopulateForm(this.value)">edit</button>
                <div class="dropdown-divider"></div>
                <button  class="dropdown-item" id="deleteButton" href="#" value="${id}" onclick="removeItem(this.value)">Delete</button>`
            }

            </div>
            </div>
        </div>
        
        ${
          date_created === date_updated
            ? ``
            : `<div>[ Edited <i class="fi fi-rr-pencil"></i> ]<br></div>`
        }
        ${
          message !== ``
            ? `<div class="tweet-text" id ="text${id}">${message}</div>`
            : ``
        }
        ${
          img_id !== "-1"
            ? `<div class="tweet-media bg-light m-2 rounded">
                <img src="/image/${img_id}" class="draw-picture img-fluid" alt="Image">
                </div>`
            : ``
        }
        
        <div class="row text-muted m-2 ">
            
            <div class="col-md-2 justify-content-center">

            <span id = "retweet${id}" class="fi fi-sr-arrows-retweet" style="color: rgb(108, 117, 125);" onclick="retweet_blog(${id})"></span>
            </div>
            <div class="col-md-2 justify-content-center">
            ${
              like_check
                ? `<span id = "like${id}" class="fi fi-ss-heart" style="color: red;" onclick="like_blog(${id})">
                ${like_val}</span>`
                : `
            <span id = "like${id}" class="fi fi-ss-heart"  onclick="like_blog(${id})">${like_val}</span>`
            }
            </div>
            <div class="col-md-2 justify-content-center">
            <a href = "mailto: ${email}"><i class="fi fi-sr-envelope-open" ></i></a>
            </div>
        </div>
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

function diff_minutes(dt1) {
  console.log("date in : " + dt1);
  let daynow = new Date();
  let date_b4 = new Date(dt1 + " UTC");
  //console.log("daynow : "+ daynow)
  //console.log("min : "+ date_b4)
  let diff = (daynow.getTime() - date_b4) / 1000;
  diff /= 60;
  let result = Math.abs(Math.round(diff));
  if (result > 60) {
    result /= 60;
    result = Math.abs(Math.round(result));
    if (result > 24) {
      //console.log("in date");
      result /= 24;
      result = Math.abs(Math.round(result));
      if (result <= 7) {
        result += "d";
      } else {
        result = new Date(dt1).toLocaleDateString("en-GB");
      }
    } else {
      //console.log("in hour");
      result += "h";
    }
  } else {
    if (diff < 1) {
      result = "Just Post";
    } else {
      result += "min";
    }
    //console.log("in min");
  }
  //console.log(result);
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

function like_blog(id) {
  let color = document.getElementById("like" + id).style.color;
  let state = true;
  if (color === "red") {
    state = false;
    document.getElementById("like" + id).style.color = "#6c757d";
    document.getElementById("like" + id).innerHTML -= 1;
    fetch_like(state, id);
    return;
  }
  document.getElementById("like" + id).style.color = "red";

  document.getElementById("like" + id).disabled = true;
  setTimeout(() => {
    document.getElementById("like" + id).disabled = false;
  }, 1000);
  document.getElementById("like" + id).innerHTML =
    parseInt(document.getElementById("like" + id).innerHTML) + 1;
  fetch_like(state, id);
}

function fetch_like(state, id) {
  const data = { state: state, blog_id: id };

  fetch("/update_like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (response.ok) {
        console.log("Like updated");
      } else {
        console.error("Error updating like:", response.statusText);
      }
    })
    .catch((error) => {
      // There was a network error
      console.error("Network error:", error);
    });
}

function retweet_blog(id) {
  let color = document.getElementById("retweet" + id).style.color;
  if (color === "green") {
    document.getElementById("retweet" + id).style.color = "#6c757d";
  } else {
    document.getElementById("retweet" + id).style.color = "green";
  }
}

function get_val(array, id) {
  let num = 0;
  try {
    num = array.length;
  } catch (error) {}

  return num;
}
function check_color(array, id) {
  let check = false;
  // console.log(id)
  try {
    check = array.includes(id);
    // console.log(check)
  } catch (error) {
    // array is not a valid array
  }
  return check;
}

function tweet_mess() {
    alert("value");
  }
  
