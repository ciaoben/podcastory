/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useState} from 'react';
import type {Node} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
  TouchableHighlight,
  Dimensions,
  Button,
  TouchableOpacity,
} from 'react-native';

import {Slider} from '@miblanchard/react-native-slider';
import Modal from 'react-native-modalbox';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import TrackPlayer from 'react-native-track-player';

TrackPlayer.setupPlayer({waitForBuffer: true}).then(async () => {
  console.log('player setup!');

  await TrackPlayer.updateOptions({
    stopWithApp: false,
    capabilities: [
      TrackPlayer.CAPABILITY_PLAY,
      TrackPlayer.CAPABILITY_PAUSE,
      TrackPlayer.CAPABILITY_STOP,
    ],
    compactCapabilities: [
      TrackPlayer.CAPABILITY_PLAY,
      TrackPlayer.CAPABILITY_PAUSE,
      TrackPlayer.CAPABILITY_STOP,
    ],
    notificationCapabilities: [
      TrackPlayer.CAPABILITY_PLAY,
      TrackPlayer.CAPABILITY_PAUSE,
      TrackPlayer.CAPABILITY_STOP,
    ],
  });
});

const Stack = createStackNavigator();

const fetchPodcastList = async () => {
  const url = 'https://api.spreaker.com/v2/search?type=shows&q=podcastory';
  const result = await fetch(url);
  return result.json();
};

const fetchSingleShow = async id => {
  const url = 'https://api.spreaker.com/v2/shows/' + id;
  const result = await fetch(url);
  return result.json();
};

const fetchEpisodes = async id => {
  const url = 'https://api.spreaker.com/v2/shows/' + id + '/episodes';
  const result = await fetch(url);
  return result.json();
};

const ShowStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    padding: 8,
  },

  cover: {
    width: 64,
    height: 64,
    marginRight: 12,
    borderRadius: 4,
  },

  title: {
    fontWeight: '600',
    fontSize: 14,
    color: 'white',
  },
});

const Show = props => {
  const {show} = props;

  return (
    <View style={ShowStyles.container}>
      <Image
        style={ShowStyles.cover}
        source={{
          uri: show.image_url,
        }}
      />

      <Text style={ShowStyles.title}>{formatTitle(show.title)}</Text>
    </View>
  );
};

const EpisodeStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    width: '100%',
    padding: 8,
    backgroundColor: '#262626',
    borderRadius: 4,
  },

  title: {
    fontWeight: '600',
    fontSize: 15,
    color: 'white',
    marginBottom: 8,
  },

  duration: {
    fontSize: 12,
    opacity: 0.8,
    color: 'white',
  },
});

const millisToMinutesAndSeconds = millis => {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);

  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
};

const secsToMinutesAndSeconds = seconds => {
  const format = val => `0${Math.floor(val)}`.slice(-2);
  const hours = seconds / 3600;
  const minutes = (seconds % 3600) / 60;

  let minutesAndSecs = [minutes, seconds % 60].map(format).join(':');

  if (Math.floor(hours) > 0) {
    minutesAndSecs = `${hours}:` + minutesAndSecs;
  }

  return minutesAndSecs;
};

const Episode = props => {
  const {ep} = props;

  return (
    <View style={EpisodeStyles.container}>
      <Text style={EpisodeStyles.title}>{ep.title}</Text>
      <Text style={EpisodeStyles.duration}>
        {millisToMinutesAndSeconds(ep.duration)}
      </Text>
    </View>
  );
};

const formatTitle = title => {
  const parts = title.split('-');
  if (parts.length === 1) {
    return title;
  }

  let withNewLines = '';
  for (let idx in parts) {
    if (idx === 0) {
      withNewLines += parts[idx];
      continue;
    }

    withNewLines += '\n' + parts[idx].trim();
  }

  return withNewLines;
};

// const playEpisode = async ep => {

//   let trackIndex = await TrackPlayer.getCurrentTrack();
//   console.log(trackIndex, 'trackIndex');

//   // setTimeout(() => {
//   //   TrackPlayer.pause();
//   // }, 7000);
// };

class PlayerProgress extends TrackPlayer.ProgressComponent {
  render() {
    return (
      <View>
        <Slider
          animateTransitions={true}
          value={this.getProgress()}
          thumbStyle={{
            backgroundColor: '#FBDE01',
          }}
          minimumTrackTintColor="#FBDE01"
          maximumTrackTintColor="#262626"
          thumbTouchSize={{width: 60, height: 60}}
          onValueChange={() => {}}
        />

        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text style={{color: 'white'}}>
            {secsToMinutesAndSeconds(this.state.position)}
          </Text>

          <Text style={{color: 'white'}}>
            {secsToMinutesAndSeconds(this.state.duration)}
          </Text>
        </View>
      </View>
    );
  }
}

const ShowDetailScreen = ({route}) => {
  const backgroundStyle = {
    backgroundColor: '#0D0D0D',
  };

  const [fullShow, setFullShow] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [playerOpened, setPlayerOpened] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [currentRate, setCurrentRate] = useState(1);

  const [playerStatus, setPlayerStatus] = useState('idle');

  useEffect(() => {
    TrackPlayer.addEventListener('playback-state', async data => {
      console.log('status changed 44', data);
      setPlayerStatus(data.state);
    });

    TrackPlayer.addEventListener('playback-error', async (code, error) => {
      console.log('playback error', code, error);
    });
  }, []);

  useEffect(() => {
    fetchSingleShow(route.params.show.show_id).then(res => {
      setFullShow(res.response.show);
    });

    fetchEpisodes(route.params.show.show_id).then(res => {
      setEpisodes(res.response.items);
    });
  }, [route]);

  useEffect(async () => {
    if (!selectedEpisode) {
      return;
    }

    await TrackPlayer.add([
      {
        id: selectedEpisode.episode_id,
        url: selectedEpisode.playback_url,
        title: selectedEpisode.title,
        artist: 'deadmau5',
        artwork: selectedEpisode.image_original_url,
        duration: selectedEpisode.duration / 1000,
      },
    ]);
  }, [selectedEpisode]);

  // get the size of the image, useful to respect the aspect ratio
  // useEffect(() => {
  //   if (!fullShow) {
  //     return;
  //   }
  //   console.log('getting size of the image');

  //   Image.getSize(fullShow.image_original_url, (width, height) => {
  //     console.log(width, height, 'image size');
  //   });
  // }, [fullShow]);

  // this assume the image is square, if not, use the code commented up here to
  // make the right calc
  const imageSquareSize = Dimensions.get('window').width / 3 - 8; // remove lateral padding

  const skip15 = async () => {
    const currentPosition = await TrackPlayer.getPosition();
    TrackPlayer.seekTo(currentPosition + 15);
  };

  const setRate = async () => {
    const currentRate = await TrackPlayer.getRate();
    console.log(currentRate, 'currentRate');

    let next = 1;
    if (currentRate == 1) next = 1.25;
    if (currentRate == 1.25) next = 1.5;
    if (currentRate == 1.5) next = 2;

    setCurrentRate(next);

    TrackPlayer.setRate(next);
  };

  const playEpisode = async () => {
    if (playerStatus === 'playing') {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <Modal
        isOpen={playerOpened}
        onClosed={() => {
          setPlayerOpened(false);
          TrackPlayer.stop();
          TrackPlayer.setRate(1);

          TrackPlayer.removeUpcomingTracks().then(() => {
            console.log('queue cleaned');
          });
        }}
        animationDuration={500}
        style={{flex: 1, backgroundColor: 'black', height: 200}}>
        {selectedEpisode && (
          <View
            style={{
              height: 200,
            }}>
            <Image
              resizeMode="contain"
              style={{
                width: Dimensions.get('window').width,
                height: Dimensions.get('window').width,
                marginBottom: 40,
              }}
              source={{
                uri: selectedEpisode.image_original_url,
              }}
            />

            <View style={{paddingLeft: 12, paddingRight: 12}}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: 50,
                }}>
                {selectedEpisode.title}
              </Text>

              <PlayerProgress />
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 80,
              }}>
              <TouchableOpacity
                onPress={playEpisode}
                style={{
                  width: 72,
                  height: 72,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 100,
                  backgroundColor: 'white',
                  color: 'black',
                }}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontStyle: 'italic',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    color: 'black',
                    fontSize: 14,
                  }}>
                  {playerStatus === 'playing' ? 'Pause' : 'Play'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={skip15}
                style={{
                  width: 72,
                  height: 72,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 100,
                  backgroundColor: 'white',
                  marginLeft: 20,
                }}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontStyle: 'italic',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    color: 'black',
                  }}>
                  Skip 15
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={setRate}
                style={{
                  width: 72,
                  height: 72,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 100,
                  backgroundColor: 'white',
                  color: 'black',
                  marginLeft: 20,
                }}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontStyle: 'italic',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    color: 'black',
                  }}>
                  {currentRate}x
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            color: 'red',
            backgroundColor: '#0D0D0D',
            paddingTop: 50,
            paddingLeft: 12,
            paddingRight: 12,
          }}>
          {/* header info */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}>
            {fullShow && (
              <Image
                resizeMode="contain"
                style={{
                  width: imageSquareSize,
                  height: imageSquareSize,
                }}
                source={{
                  uri: fullShow.image_original_url,
                }}
              />
            )}
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: 'white',
                paddingLeft: 8,
                flex: 1,
                flexWrap: 'wrap',
              }}>
              {formatTitle(route.params.show.title)}
            </Text>
          </View>

          {!fullShow && <ActivityIndicator color="#00ff00" />}

          {fullShow && (
            <Text
              style={{
                color: 'white',
                lineHeight: 20,
                paddingBottom: 20,
              }}>
              {fullShow.description}
            </Text>
          )}

          {episodes.map(ep => {
            return (
              // <View style={{marginBottom: 8}} >
              <TouchableHighlight
                key={ep.episode_id}
                activeOpacity={0.7}
                underlayColor="#3B3B3B"
                onPress={() => {
                  setSelectedEpisode(ep);
                  setPlayerOpened(true);
                }}>
                <Episode ep={ep} key={ep.episode_id} />
              </TouchableHighlight>
              // </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ShowListScreen = ({navigation}) => {
  const backgroundStyle = {
    backgroundColor: '#0D0D0D',
  };

  // const ShowListScreenStyles = {}

  const [shows, setShows] = useState([]);

  useEffect(async () => {
    const pods = await fetchPodcastList();
    setShows(pods.response.items);
  }, []);

  console.log('this', 'snippet');

  return (
    <SafeAreaView style={backgroundStyle}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            color: 'red',
            backgroundColor: '#0D0D0D',
            paddingTop: 50,
            paddingLeft: 12,
            paddingRight: 12,
          }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              marginBottom: 20,
              color: 'white',
            }}>
            Show
          </Text>
          {shows.map(s => (
            <TouchableHighlight
              key={s.id}
              activeOpacity={0.2}
              underlayColor="#3B3B3B"
              onPress={() => navigation.navigate('Show', {show: s})}>
              <Show show={s} key={s.id} />
            </TouchableHighlight>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const App: () => Node = () => {
  useEffect(() => {
    TrackPlayer.setupPlayer().then(() => {
      // The player is ready to be used
      console.log('player is ready to user');
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Stack.Navigator>
        <Stack.Screen
          name="Shows"
          options={{headerShown: false}}
          component={ShowListScreen}
        />

        <Stack.Screen
          name="Show"
          options={{headerShown: false}}
          component={ShowDetailScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
