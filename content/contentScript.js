// I'll add some way to toggle debugging mode somehow later...
let debugging = false
let debug = message => debugging && console.log(message)

chrome.storage.sync.get(["keys"], ({keys}) => {
    chrome.storage.sync.get(keys.split(' '), updateAttributes)
})

chrome.storage.onChanged.addListener((changes) => {
    Object.entries(changes).map(([key, values]) => {
        updateAttributes({[key]: values.newValue})
    })
})

function updateAttributes(newState){
    Object.entries(newState).map(([key, val]) => {
        switch(key){
            case 'mood':
                let currentMood = document.lastChild.getAttribute('mood')
                if(currentMood && val != currentMood){ location.reload() }
            case 'nometric':
            case 'nocap':
            case 'nokey':
            case 'nobalance':
            case 'noleaders':
            case 'noprice':
            case 'noblchk': 
            case 'invert':
            case 'imgfix':
            case 'nospam':
            case 'noreps':
            default:
                if(val){
                    document.lastChild.setAttribute(key, val)
                } else {
                    document.lastChild.removeAttribute(key)
                }
        }
    })
}

new MutationObserver(mutationsList => {
    // anytime a mutatution has occured,
    // check the location.href and update the document.title
    if(location.href != lastLocation){
        lastLocation = location.href
        updateTitleText()
    }
    mutationsList.map(mutation => {
        Array.from(mutation.addedNodes, function(node){
            if(!node.classList || !node.parentElement)
            {
                debug("branch 0")
                 /* early exit: if it's a text node or an orphaned node just forget it */
                return null
            }
            // PROFILE
            else if("CREATOR-PROFILE-TOP-CARD" == node.tagName)
            {
                debug("branch 1")
                mutateProfilePrice(node)
            }
            // MAIN FEED
            /* these are annoying, I was trying to nail down the case of switching between Global and Following, and changing screen width */
            else if(node.previousElementSibling && "TAB_SELECTOR" === node.previousElementSibling.tagName)
            {
                debug("branch 2")
                Array.from(node.children, child => {
                    mutateComment(child.querySelector('.js-feed-post'))
                })
            }
            else if("TAB_SELECTOR" === node.tagName)
            {
                debug("branch 3")
                Array.from(node.nextElementSibling.children, child => {
                    mutateComment(child.querySelector('.js-feed-post'))
                })
            }
            // if the node is a child of the creators leaderboard, its price is its lastChild
            else if("RIGHT-BAR-CREATORS-LEADERBOARD" == node.parentElement.tagName)
            {
                debug("branch 4")
                mutatePrice(node.lastChild)
            }
            // if the node has a search-bar avatar as its firstChild, then its price is its lastChild
            else if(node.firstElementChild && node.firstElementChild.classList.contains('search-bar__avatar'))
            {
                debug("branch 5")
                mutatePrice(node.lastElementChild)
            }
            // INBOX
            else if(location.pathname.startsWith('/inbox'))
            {
                debug("branch 6..")
                if(node.firstElementChild && node.firstElementChild.classList.contains('messages-thread__avatar'))
                {
                    debug("branch 6.1")
                    mutatePrice(node.lastElementChild.lastElementChild)
                }
                else if(node.classList.contains("messages-thread__border-radius") && endsWithPrice(node))
                {
                    debug("branch 6.2")
                    mutatePrice(node)
                }
            }
            // the creator-coin tab of the profile page, the rows that end with a price need their lastChild updated
            else if(location.pathname.endsWith('followers') || location.pathname.endsWith('following'))
            {
                debug("branch 7..")
                if(node.parentNode.parentNode
                && node.parentNode.parentNode.parentNode
                && node.parentNode.parentNode.parentNode.tagName == "MANAGE-FOLLOWS")
                {
                    debug("branch 7.1")
                    mutateFollowers(node)
                }
            }
            else if(node.classList.contains('js-feed-post'))
            {
                debug("branch 10")
                mutateComment(node)
            }
            else if(location.pathname.startsWith('/u/'))
            {
                debug("branch 8..")
                if(node.tagName == "SPAN")
                {
                    return null
                }
                // ask for the text content of the node and find out if it ends with a price
                // could constrain to location search creator coin
                if(node.classList && node.classList.contains('row') && endsWithPrice(node))
                {
                    debug("branch 8.2")
                    // OK, the node is the container row, the price is the lastChild
                    mutatePrice(node.lastElementChild)
                }
                else if("TAB-SELECTOR" == node.parentNode.parentNode.tagName)
                {
                    debug("branch 8.3")
                    node.textContent.trim() == "Creator Coin" && node.insertAdjacentElement('afterEnd', renderMediaTab())
                }
                else
                {
                    // debug("branch 8.?")
                    // console.warn(node)
                }
            }
            // if(/modal-container/i.test(node.tagName)){ mutateComment(node)}
            // else if(node.classList.contains("modal-backdrop"))
            // { 
            //     debug("branch 10")
            //     mutateComment(node.nextElementSibling)
            // }

            // if INBOX
            // if(/^messages-thread.*ng-star-inserted/i.test(node.tagName)){ mutateInbox(node)}
        })
    })
}).observe(document.body, {
    childList: true,
    subtree: true
})


function endsWithPrice(node){
    return /\$[\d,]+\.\d{2}K{0,1}$/.test(node.textContent.trim())
}
/* right now I'm only ever updating an attribute on the body and letting CSS do the rest */
/* this is changes that occur via popup */
/* all other actions are triggered by mutation events */


// on updateAttributes, if the attribute is mood, refresh the page...
// Later, I can pack all the different modes as psuedo elements and switch more seamlessly...
function MoneyInWhatMood(price, int, exp){
    let mood = document.lastChild.getAttribute("mood")
    // concat is just doing an emoji compatible padStart (❤️.length == 2), padStart hated that
    // maybe if I import leftPad my issue can be solved...
    let repeat = (string, times) => times <= 1 ? string : string + repeat(string, --times)

    const moods = {
        'red hearts': '❤️',
        'gold stars': '⭐',
        'diamondhands': '💎',
        'dollar sign': '$',
        'bananas': '🍌'
    }    
    switch(mood){
        case 'red hearts': 
        case 'dollar sign':
        case 'diamondhands':
        case 'gold stars':
        case 'bananas':
            return repeat(moods[mood], exp)
        case 'romanize':
            return romanize(int)
        case 'internetpts':
            return int
        default:
            return price
        // maybe case custom: grab the custom attribute off of body?
        // can 'content' of a psuedo element be var var var var ? to allow any emoji set as css variable?
    }
}





function mutatePrice(priceHolder, target){
    debug("mutate price")
    debug(priceHolder)
    if(!priceHolder || !priceHolder.getAttribute){
        return console.error("no priceholder, skipping.")
    }
    if(priceHolder.getAttribute("tag")){
        return console.error("Same price mutated twice")
    }
    let price = priceHolder.innerText
    let int = parseInt(price.replace(',','').match(/\d+/))
    if(price.includes('K')){ int *= 1000 }
    let exp = parseInt(Math.max(1, Math.log10(int)))
    priceHolder.innerText = " " + MoneyInWhatMood(price, int, exp) + " " // replace according to current settings, maybe an emoji or whathaveyou
    priceHolder.setAttribute("tag", "price")
    target && target.setAttribute("exp", exp)
}

function mutateComment(node){
    // this is assuming we're at js-feed-post level

    // starting from the div.js-feed-post go up two...
    // if we're on a /u/ page, this is the element we need to tag with exp
    let commentContainer = node.parentElement.parentElement 
    // if the identified comment container is actually quoted content, don't set the exp attribute for content filtering
    if(commentContainer.classList.contains('feed-post__quoted-content'))
    {
        debug("MUTATECOMMENT ignored container for quoted content")
        commentContainer = null
    }
    else if(commentContainer.parentElement.tagName == "COMMENT-MODAL")
    {
        debug("MUTATECOMMENT ignored container for comment modal")
        commentContainer = null
    }
    else if(!location.pathname.startsWith('/u/'))
    {
        commentContainer = commentContainer.parentElement
    }

    if(commentContainer && node.querySelectorAll('i.icon-repost').length === 3){
        commentContainer.classList.add("repost")
        if(node.querySelector('[tabindex]')
               .textContent
               .match(/re-?clout/i))
        {
            commentContainer.classList.add("spam")
        }
    }

    // maybe mutate price should just return {int, exp, price} and then I can decide what to do with it...
    let coinholder = node.querySelector(".feed-post__coin-price-holder")

    if(!coinholder){
        // so far the only time this happens is when a repost includes a deleted post
        console.error("No coinholder", commentContainer)
        commentContainer.style.display = "none"
    } else {
        mutatePrice(
            coinholder,
            commentContainer
        )
    }
}

// Profile : Posts | Creator Coin
// on mutation, I can set tab selector parent node last child as hidden until I click, count the number of shareholders, click back, and drop the hidden style
// maybe set an attribute on the parentNode, "INPROGRESS"=true, when the counting is done, delete the attribute.
// find posts / creator coin, click creator coin, count the list...
// [inprogress]:last-child {visibility: hidden} 
function mutateFollowers(node){
    mutatePrice(
        node.querySelector('.feed-post__coin-price-holder'),
        node /* tag this node with an exp* attribute so my coin filter works */
    )
}

function mutateProfilePrice(node){
    mutatePrice(
        // node.firstElementChild.children[3].lastElementChild.lastElementChild.firstElementChild
        // node.firstElementChild.children[3].lastElementChild.children[1].firstElementChild
        node.firstElementChild.children[3].lastElementChild.querySelector('div').firstElementChild
    )
}

function mutateInbox(node){
    // Array.from(node.children, child => 
}


function updateTitleText(){
    let suffix = " - BitClout"
    let [route, subroute] = location.pathname.split('/').slice(1)
    debug([route, subroute])
    switch(route){
        case 'inbox':
            if(!subroute) document.querySelector("messages-thread").firstChild.click()
            else document.title =  "Inbox: " + subroute + suffix
        break
        case 'wallet':
            document.title = "Wallet" + suffix
        break
        case 'browse':
            let browsingContext = location.search.match(/feedTab=(\w+)/)
            document.title = browsingContext ? (browsingContext[1] + " Timeline" + suffix) : ("Home" + suffix)
        break
        case 'u':
            document.title = subroute + suffix
        break
        case 'posts':
            setTimeout(() => {
                document.title = document.querySelector('post-thread').firstElementChild.firstElementChild.innerText
            }, 100)
    }
}

function cacheWallet(){
    // if location is wallet, capture the row nodes and parse their values...
    // ...stash the profile pics in sync storage... 
    // replace Top Weakly Creators with Your Top Creators
    //  sync will have to be key value:
    // each key is a date, corresponding 
    // then a header row can be updated labeling each column
    // empty columns is OK ,,,, 
    // 
}

function tagFinanceButtons(node){
    Array.from(node.querySelectorAll('left-bar-button'), (element, index) => {
        if([1,2,3,4].includes(index)){
            element.setAttribute("tag","finance")
        }
    })
}


// It seems on navigate I unload and reload a new app-root, so to catch this I need an observer on the body
// on page change, well see how it looks on change...
let lastLocation = null



// As elements are headed to the screen, they are filtered down to those of interest and processed right away
// Maybe as I add jobs to the schedule I can set an attribute of 'done' and hide everything with done=0 

// Two disclaimers
// This while have harmful pscyhological effects on a lot of people 
// People are going to lose a lot of money if they're not careful
// That means, not keeping your private key written on a post it note, not trying to just remember it in your head,
// not leaving your computer unlocked - it's about 4 clicks to transfer your balance to an anonymous address.
// Watching out for obvious scams, impersonator accounts, prosperity gospel ministers, and catfish.
// Essentially as money is moved into this new economy, it moves from people who lose it easily to people who make positive returns.
// Be careful with biometrics, you just made your fingerprint worth your bank account.


// so this alerts me of the page changing... I don't yet know if new content exists at this point

/*
Maybe load the CSS first so that the price isn't shown at all until I set the exponent and perform the string replacement

While we're at it, 
when I recognize there's a new Weekly Creators list, 

Weekly Creators becomes a Myspacesque "Top 8 Friends" list except to put someone on this list you have to put capital into them.
Yes when you're on someone's profile, it would be ideal if I could see the top coins that THEY own (not even the amount they own, but of course its one click away to see an IDs creator coins...)


Let's set an attribute for "exponent" so after I grab the integer,
*/
// Credit to Steven Levithan 
// https://stackoverflow.com/questions/9083037/convert-a-number-into-a-roman-numeral-in-javascript
// http://blog.stevenlevithan.com/archives/javascript-roman-numeral-converter
// function romanize (num) {
//     if (isNaN(num))
//         return NaN;
//     var digits = String(+num).split(""),
//         key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
//                "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
//                "","I","II","III","IV","V","VI","VII","VIII","IX"],
//         roman = "",
//         i = 3;
//     while (i--)
//         roman = (key[+digits.pop() + (i * 10)] || "") + roman;
//     return Array(+digits.join("") + 1).join("M") + roman;
// }

function romanize(num) {
    	// Ⅱ	Ⅲ			Ⅵ	Ⅶ	Ⅷ			Ⅺ	Ⅻ				
    var lookup = {
        C̅: 100000,
        X̅C̅: 90000,
        L̅: 50000,
        X̅L̅: 40000,
        X̅: 10000,
        ⅯX̅: 9000,
        V̅: 5000,
        ⅯV̅: 4000,
        Ⅿ:1000,
        ⅭⅯ:900,
        Ⅾ:500,
        ⅭⅮ: 400,
        Ⅽ:100,
        ⅩⅭ:90,
        Ⅼ:50,
        ⅩⅬ:40,
        Ⅹ:10,
        Ⅸ:9,
        Ⅴ:5,
        Ⅳ:4,
        Ⅰ:1
    }
    var roman = ''
    for (var i in lookup ) {
      while ( num >= lookup[i] ) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  }

// 5,000   ↁ  V̅
// 10,000  ↂ  X̅	
// 50,000  ↇ L̅
// 100,000 ↈ C̅

/* TO DO */