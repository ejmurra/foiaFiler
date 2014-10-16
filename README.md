foiaFiler
=========

Foia filing and tracking site

Run in dev environment
----------------------

1. Install nodejs and mongodb
2. cd to foiaFiler dir and type:
    ```
    ->$ sudo npm install
    ->$ node app.js
    ```
3. Point your browser to 127.0.0.1:3000

To do
-----

* Create an auth file for sensitive info
* Finish email templating (with sendgrid)
* Log emails sent
* Parse and log replies
* Find a nice way to display Foias filed through our app
* Set up email forwarding so that responses also go to original email
* Make a pretty frontend :)