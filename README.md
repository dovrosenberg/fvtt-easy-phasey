# fvtt-easy-phasey
Foundry VTT module to support phased maps

[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/dovrosenberg/fvtt-easy-phasey/raw/main/static/module.json)](https://github.com/dovrosenberg/fvtt-easy-phasey)

Easy Phasey allows you to quickly setup phased maps in Foundry - maps that change over the course of the battle.  Why not just use different scenes?  Because switching scenes requires you to then reset a bunch of other things like tokens, fog of war, etc.  This module handles all that for you.

You just create a folder with the scenes you want to use for the phases, and then use the module to setup the order.  You can then move through the scenes (forward and back) with the click of a button.  Easy Phasey.

Why phased maps?  If you're reading this you probably already know, but there are a variety of use cases for phased maps: 
- Battles that change over time to put pressure on the characters (rising water, lava changing patterns, walls closing in)
- Transition a map between times of day, weather, etc.
- Easily time when and where new actors should appear
- Probably others I can't think of at the moment


## Current features
[Feature requests?](https://github.com/dovrosenberg/fvtt-easy-phasey/issues/new?template=feature_request.md)

- Select any folder of scenes to use for the phases
- Choose the order the phases should appear, and mark scenes to skip
- Track the chosen phases/order as well as the current phase you're in for each folder (i.e. you can have multiple phased scenes in various parts of their progression at once)
- Choose to ignore stray tokens in the phases as you progress or to merge them in --- this lets you use phases to automatically add additional actors when they come up

## Usage
Create a scene folder with the set of scenes you want to transition between.

After installing the module, you should see in your left controls the easy phasey control:

<img width="259" height="73" alt="Image" src="https://github.com/user-attachments/assets/ea0b21be-fd94-414e-8892-a3d94b20efe2" />

Then click the config button:

<img width="54" height="54" alt="Image" src="https://github.com/user-attachments/assets/46c78f1d-3d66-408e-b4c8-0a329cad459a" />

And you should get the folder selector box:

<img width="569" height="192" alt="Image" src="https://github.com/user-attachments/assets/c0723937-49da-4a3b-98a4-87d04345afff" />

Pick the folder with your scenes in it and then configure the order:

<img width="567" height="358" alt="Image" src="https://github.com/user-attachments/assets/1f0eaa45-8d81-4cdc-a5f2-9a795ce15066" />

When you hit "save and activate" it should immediately activate the 1st scene, and the easy phasey menu controls should change to the back/forward buttons:

<img width="48" height="146" alt="Image" src="https://github.com/user-attachments/assets/3775c8e6-e433-4bcf-9f2b-b41fe8a44dce" />

Just use those buttons to move between scenes.

By default, all tokens stay in the same place they were when moving between scenes.  If the "merge tokens" button is checked, then any tokens saved on the scene you are moving to are retained, resulting in both the tokens from the prior scene and the new one being present.  This is helpful, for example, if you want to pre-place some NPCs/enemies in one of the transitions and have them appear automatically.

## Issues?

If you believe you found a bug or would like to post a feature request, head over to the module's [Github repo](https://github.com/dovrosenberg/fvtt-easy-phasey) and [open a new issue](https://github.com/dovrosenberg/fvtt-easy-phasey/issues/new/choose).

## Languages

English, French, and German currently supported.  Let me know if you want others.  PRs also welcome for either new languages or fixes to bad translations in the current ones.  

## Support
I'm happy to do this for free, as I primarily work on things I like to use myself.  But if you'd like to [buy me a root beer](https://ko-fi.com/phloro), I love knowing that people are using my projects and like them enough to make the effort. It's really appreciated!  

## Credits
ChatGPT was used to speed up the development process, as well as to do the language translations.


## Copyright and usage
THIS ENTIRE REPOSITORY IS COVERED BY THIS LICENSE AND COPYRIGHT NOTICE

Copyright 2025 Dov Rosenberg

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the specific language governing permissions and limitations under the License.
